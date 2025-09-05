import os
import json
import time
import logging
import subprocess
import tempfile
import asyncio
from typing import List, Dict, Optional
import concurrent.futures

import google.generativeai as genai
from z3 import Solver, String, Or, sat, unsat

from app.celery_app import celery_app
from app.db.session import SessionLocal
from app.db.models import Scan, Organization
from app.api.endpoints.github import get_installation_access_token
from app.core.config import settings

# Import exactly what we need from your llm utils module
from app.llm_utils import (
    SUPPORTED_EXTENSIONS,
    MIN_FILE_BYTES_TO_CONSIDER,
    MAX_FILES_TO_ANALYZE,
    MAX_PARALLEL_CHUNKS,
    file_hash,
    heuristic_risk_score,
    detect_language_by_ext,
    chunk_by_function_boundaries,
    llm_analyze_chunk,
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


# --- SYMBOLIC CHECK HELPERS ---


def normalize_analysis(raw_files: List[Dict]) -> List[Dict]:
    """
    Normalize LLM per-file results into a flat list of rules suitable for symbolic checks.
    Input expected as list of file dicts with "file" and "analysis" keys.
    """
    normalized = []
    for file_report in raw_files:
        file_name = file_report.get("file")
        for entry in file_report.get("analysis", []):
            normalized.append({
                "file": file_name,
                "function": entry.get("function_name") or "unknown",
                "required_role": (entry.get("required_role") or "unknown").lower(),
                "issues": [entry.get("issue")] if entry.get("issue") else [],
            })
    return normalized


def check_role_consistency(normalized: List[Dict]) -> Dict:
    """
    Basic Z3 check for obvious contradictions in role requirements.
    This is a coarse check — extend as needed for richer constraint modeling.
    """
    solver = Solver()
    # We'll model a generic 'role' string and add constraints derived from required_role.
    role = String("role")

    # For each required role, add constraints that role must be at least that level.
    # (This is simplistic: admin >= member, owner > admin)
    for entry in normalized:
        required = entry.get("required_role", "unknown")
        if required in ("public", "unknown"):
            continue
        if required == "member":
            solver.add(Or(role == "member", role == "admin", role == "owner"))
        elif required == "admin":
            solver.add(Or(role == "admin", role == "owner"))
        elif required == "owner":
            solver.add(role == "owner")

    result = {"consistent": None, "conflicts": [], "satisfying_model": None}
    try:
        sat_result = solver.check()
        if sat_result == sat:
            result["consistent"] = True
            try:
                m = solver.model()
                result["satisfying_model"] = str(m)
            except Exception:
                result["satisfying_model"] = None
        elif sat_result == unsat:
            result["consistent"] = False
            # unsat_core requires assumptions; best-effort
            try:
                result["conflicts"] = str(solver.unsat_core())
            except Exception:
                result["conflicts"] = "Contradiction found; core unavailable."
        else:
            result["consistent"] = False
            result["conflicts"] = "Solver could not determine consistency."
    except Exception as e:
        result["consistent"] = False
        result["conflicts"] = f"Error running solver: {e}"

    return result


# --- CELERY TASK ---


@celery_app.task(bind=True)
def run_scan(self, scan_id: int):
    """
    Main Celery task that:
      - clones the repository (using GitHub installation token)
      - selects high-risk files (heuristic + incremental changed files)
      - chunks files (function-aware), sends chunks to LLM in parallel
      - aggregates LLM outputs per-file
      - runs a symbolic/Z3 check over normalized rules
      - writes scan.results and status back to DB
    """
    logger.info("WORKER: Received scan_id=%s", scan_id)
    db = SessionLocal()
    scan: Optional[Scan] = None

    try:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan:
            logger.error("WORKER: Scan %s not found", scan_id)
            return "Scan not found."

        organization = db.query(Organization).filter(Organization.id == scan.organization_id).first()
        if not organization or not organization.github_installation_id:
            raise Exception("Organization or GitHub installation not found.")

        # Mark scan in progress
        scan.status = "in_progress"
        db.commit()

        # Get installation token and clone URL
        token = asyncio.run(get_installation_access_token(organization.github_installation_id))
        clone_url = f"https://x-access-token:{token}@github.com/{scan.repository_name}.git"

        # Load previous file hashes if available to support incremental scanning
        prev_hashes: Dict[str, str] = {}
        if isinstance(scan.results, dict):
            prev_hashes = scan.results.get("file_hashes", {}) or {}

        file_hashes: Dict[str, str] = {}
        per_file_results: List[Dict] = []

        with tempfile.TemporaryDirectory() as tmpdir:
            logger.info("WORKER: Cloning %s into %s", scan.repository_name, tmpdir)
            subprocess.run(["git", "clone", "--depth", "1", clone_url, tmpdir], check=True, capture_output=True)
            logger.info("WORKER: Clone complete")

            # Discover source files
            source_files: List[Dict] = []
            for root, _, files in os.walk(tmpdir):
                for file in files:
                    if file.lower().endswith(SUPPORTED_EXTENSIONS):
                        path = os.path.join(root, file)
                        try:
                            size = os.path.getsize(path)
                        except OSError:
                            size = 0
                        if size < MIN_FILE_BYTES_TO_CONSIDER:
                            continue
                        h = file_hash(path)
                        rel = os.path.relpath(path, tmpdir)
                        file_hashes[rel] = h
                        changed = prev_hashes.get(rel) != h
                        source_files.append({"path": path, "relpath": rel, "size": size, "hash": h, "changed": changed})

            if not source_files:
                raise Exception("No supported source files found in repository.")

            # Heuristic risk scoring (sample the head of files to avoid reading huge files fully)
            for f in source_files:
                try:
                    with open(f["path"], "r", errors="ignore") as fh:
                        content_head = fh.read(16 * 1024)
                except Exception:
                    content_head = ""
                f["score"] = heuristic_risk_score(f["path"], f["size"], content_head)

            # Sort by score descending
            source_files.sort(key=lambda x: x["score"], reverse=True)

            # Build selected files: always include changed files, plus top N risky files
            selected_files: List[Dict] = []
            added = 0
            for f in source_files:
                if f["changed"] and f not in selected_files:
                    selected_files.append(f)
                elif added < MAX_FILES_TO_ANALYZE:
                    selected_files.append(f)
                    added += 1
                if len(selected_files) >= MAX_FILES_TO_ANALYZE * 2:
                    break
            
            # Deduplicate and cap
            seen = set()
            final_selected = []
            for f in selected_files:
                if f["relpath"] not in seen:
                    final_selected.append(f)
                    seen.add(f["relpath"])
            selected_files = final_selected[:MAX_FILES_TO_ANALYZE]

            logger.info("WORKER: Selected %d files for LLM analysis (out of %d source files)",
                        len(selected_files), len(source_files))

            # Parallel LLM chunking
            executor = concurrent.futures.ThreadPoolExecutor(max_workers=MAX_PARALLEL_CHUNKS)
            futures = []

            for f in selected_files:
                try:
                    with open(f["path"], "r", errors="ignore") as fh:
                        content_full = fh.read()
                except Exception:
                    content_full = ""

                f["content_full"] = content_full
                high_risk = f["score"] >= 6 or f["changed"]
                chunks = chunk_by_function_boundaries(content_full, detect_language_by_ext(f["path"]), high_risk)
                if not chunks:
                    # still append an empty analysis result placeholder
                    per_file_results.append({"file": f["relpath"], "analysis": [], "raw_outputs": ["no_chunks"]})
                    continue

                # For each chunk, submit to LLM via helper llm_analyze_chunk
                for idx, chunk in enumerate(chunks):
                    # cap chunk length for safety
                    snippet = chunk[:15000]

                    prompt = (
                        "You are an expert application security analyst. "
                        "Given the following code snippet, identify business logic rules, "
                        "access control checks, and potential permission issues. "
                        "Return ONLY a JSON object with key 'analysis' that is an array of items; "
                        "each item should include: function_name (if identifiable), required_role (admin/member/public/unknown), "
                        "issue (optional), and notes. If nothing relevant is found return {'analysis': []}.\n\n"
                        f"File: {f['relpath']} (chunk {idx+1}/{len(chunks)})\n\n"
                        "Code:\n"
                        "```\n"
                        f"{snippet}\n"
                        "```\n"
                    )

                    # --- CHANGE 1: Modified `submit` function to accept and return the code snippet ---
                    def submit(prompt_local, relpath_local, snippet_local):
                        try:
                            res = llm_analyze_chunk(prompt_local)
                        except Exception as e:
                            res = {"ok": False, "json": None, "raw": str(e)}
                        # Return the original snippet alongside the result
                        return {"file": relpath_local, "result": res, "snippet": snippet_local}

                    # Pass the snippet to the submit function
                    futures.append(executor.submit(submit, prompt, f["relpath"], snippet))

            logger.info("WORKER: Waiting for %d LLM tasks to complete", len(futures))

            # Aggregate chunk results into per-file buckets
            per_file_agg: Dict[str, Dict] = {}
            for fut in concurrent.futures.as_completed(futures):
                try:
                    out = fut.result()
                except Exception as e:
                    logger.exception("Worker LLM future raised: %s", e)
                    continue
                file_key = out["file"]
                per_file_agg.setdefault(file_key, {"chunks": [], "file": file_key})
                
                # --- CHANGE 2: Store the result and snippet together for later processing ---
                per_file_agg[file_key]["chunks"].append({
                    "result": out["result"],
                    "snippet": out.get("snippet", "") # use .get for safety
                })

            # Combine per-file chunks into a single file analysis entry
            for key, val in per_file_agg.items():
                combined_analysis = []
                raw_chunks = []
                # --- CHANGE 3: Iterate through the object containing both result and snippet ---
                for chunk_obj in val["chunks"]:
                    chunk_res = chunk_obj["result"]
                    snippet = chunk_obj["snippet"]
                    
                    if chunk_res.get("ok") and chunk_res.get("json") and isinstance(chunk_res["json"], dict):
                        entries = chunk_res["json"].get("analysis") or []
                        if isinstance(entries, list):
                            # --- CHANGE 4: Inject the code_snippet into each finding ---
                            for entry in entries:
                                if isinstance(entry, dict): # Ensure entry is a dict before adding
                                    entry["code_snippet"] = snippet
                            combined_analysis.extend(entries)
                        else:
                            raw_chunks.append(chunk_res.get("raw"))
                    else:
                        raw_chunks.append(chunk_res.get("raw"))

                per_file_results.append({
                    "file": key,
                    "analysis": combined_analysis,
                    "raw_outputs": raw_chunks
                })

            # Shutdown executor to free threads
            executor.shutdown(wait=True)

            # SYMBOLIC CHECKS (Z3) - normalize and run the role consistency check
            logger.info("WORKER: Running symbolic role consistency analysis")
            normalized = normalize_analysis(per_file_results)
            consistency_result = check_role_consistency(normalized)
            logger.info("WORKER: Symbolic analysis complete. Consistent: %s", consistency_result.get("consistent"))

            # Final report structure
            out_results = {
                "summary": {
                    "scanned_files": len(source_files),
                    "analyzed_files": len(per_file_results),
                    "timestamp": int(time.time())
                },
                "files": per_file_results,
                "file_hashes": file_hashes,
                "symbolic_analysis": {
                    "role_consistency_check": consistency_result
                },
            }

            # Persist results and mark completed
            scan.status = "completed"
            scan.results = out_results
            db.commit()
            logger.info("WORKER: Scan %s completed successfully", scan_id)
            return "Scan completed successfully."

    except Exception as exc:
        logger.exception("WORKER: Error during scan %s: %s", scan_id, exc)
        if scan:
            try:
                scan.status = "failed"
                scan.results = {"error": str(exc)}
                db.commit()
            except Exception:
                db.rollback()
        # Attempt retry via Celery (useful for transient errors)
        try:
            self.retry(exc=exc, countdown=60)
        except Exception:
            # If retry isn't possible, re-raise to mark task failed
            raise
    finally:
        try:
            db.close()
        except Exception:
            pass
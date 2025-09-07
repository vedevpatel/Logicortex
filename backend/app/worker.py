import os
import json
import time
import logging
import subprocess
import tempfile
import asyncio
from typing import List, Dict, Optional, Set
import concurrent.futures

from app.celery_app import celery_app
from app.db.session import SessionLocal
from app.db.models import Scan, Organization
from app.api.endpoints.github import get_installation_access_token
from app.symbolic_engine import build_and_check_symbolic_model
from app.core.config import settings
from app.llm_utils import (
    SUPPORTED_EXTENSIONS, MIN_FILE_BYTES_TO_CONSIDER,
    heuristic_risk_score, detect_language_by_ext,
    robust_chunker, build_prompt, 
    analyze_chunk_with_llm, stable_hash
)

MAX_FILES_TO_ANALYZE = 25
MAX_PARALLEL_CHUNKS = 2
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# --- Helper Functions ---
BLOCKLIST_FILENAMES = {"readme.md","package.json","__init__.py","gemfile","license","changelog.md",
                       "dockerfile","docker-compose.yml","requirements.txt","go.mod","go.sum","package-lock.json"}
BLOCKLIST_EXTENSIONS = {".md",".yml",".yaml",".json",".lock",".txt",".xml",".cfg",".ini"}
BLOCKLIST_DIRS = {os.path.sep + d + os.path.sep for d in ["tests","docs","config","static",".github","vendor","node_modules",".git"]}

def is_low_value_file(relpath: str) -> bool:
    lower_path = relpath.lower()
    if os.path.basename(lower_path) in BLOCKLIST_FILENAMES: return True
    if os.path.splitext(lower_path)[1] in BLOCKLIST_EXTENSIONS: return True
    for d in BLOCKLIST_DIRS:
        if d in lower_path: return True
    return False

def risk_level_from_score(score: int) -> str:
    if score > 15: return "High"
    if score > 5: return "Medium"
    return "Low"

@celery_app.task(bind=True)
def run_scan(self, scan_id: int):
    logger.info(f"WORKER: Starting scan_id={scan_id}")
    db = SessionLocal()
    scan: Optional[Scan] = None
    try:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        organization = db.query(Organization).filter(Organization.id == scan.organization_id).first()
        scan.status = "in_progress"; db.commit()

        token = asyncio.run(get_installation_access_token(organization.github_installation_id))
        clone_url = f"https://x-access-token:{token}@github.com/{scan.repository_name}.git"

        prev_hashes = scan.results.get("file_hashes", {}) if isinstance(scan.results, dict) else {}

        with tempfile.TemporaryDirectory() as tmpdir:
            subprocess.run(["git","clone","--depth","1",clone_url,tmpdir], check=True, capture_output=True)
            
            # STAGE 1: File Discovery, Pre-filtering, and Scoring
            source_files, file_hashes = [], {}
            for root, _, files in os.walk(tmpdir):
                for file in files:
                    relpath = os.path.relpath(os.path.join(root,file), tmpdir)
                    if is_low_value_file(relpath) or not file.lower().endswith(SUPPORTED_EXTENSIONS): continue
                    path = os.path.join(root,file)
                    size = os.path.getsize(path) if os.path.exists(path) else 0
                    if size < MIN_FILE_BYTES_TO_CONSIDER: continue
                    with open(path,"rb") as fh: content_bytes = fh.read()
                    file_hashes[relpath] = stable_hash(content_bytes.decode('utf-8', errors='ignore'))
                    changed = prev_hashes.get(relpath) != file_hashes[relpath]
                    content_head = content_bytes[:16*1024].decode('utf-8', errors='ignore')
                    score = heuristic_risk_score(path,size,content_head)
                    source_files.append({"path": path,"relpath": relpath,"changed": changed,"score": score})

            if not source_files: raise Exception("No supported source files found after filtering.")

            # STAGE 2: Tier-Based File Selection
            changed_files = [f for f in source_files if f["changed"]]
            must_scan_relpaths = {f['relpath'] for f in changed_files}
            critical_tier, high_tier, medium_tier = [], [], []
            for f in source_files:
                if f['relpath'] in must_scan_relpaths: continue
                if f['score'] > 40: critical_tier.append(f)
                elif f['score'] > 15: high_tier.append(f)
                elif f['score'] > 4: medium_tier.append(f)
            for tier in [critical_tier,high_tier,medium_tier]: tier.sort(key=lambda x:x['score'],reverse=True)
            selected_files_map = {f['relpath']:f for f in source_files if f['relpath'] in must_scan_relpaths}
            for tier in [critical_tier,high_tier,medium_tier]:
                for f in tier:
                    if len(selected_files_map) >= MAX_FILES_TO_ANALYZE: break
                    selected_files_map[f['relpath']] = f
            selected_files = list(selected_files_map.values())
            logger.info(f"WORKER: Selected {len(selected_files)} files for analysis.")

            # STAGE 3: Single-Stage Parallel Analysis
            per_file_agg = {}
            with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_PARALLEL_CHUNKS) as executor:
                future_to_chunk = {
                    executor.submit(
                        analyze_chunk_with_llm,
                        build_prompt(file_obj['relpath'], chunk),
                        settings.OLLAMA_MODEL # Use the single, primary model
                    ): {"file_obj": file_obj, "content": chunk}
                    for file_obj in selected_files
                    for chunk in robust_chunker(open(file_obj["path"], "r", errors="ignore").read(), detect_language_by_ext(file_obj["path"]))
                }

                for future in concurrent.futures.as_completed(future_to_chunk):
                    chunk_info = future_to_chunk[future]
                    file_relpath = chunk_info["file_obj"]["relpath"]
                    per_file_agg.setdefault(file_relpath, {"analysis": [], "raw_outputs": []})
                    try:
                        result = future.result()
                        if result and result.get("ok"):
                            findings = result["json"].get("analysis", [])
                            for finding in findings:
                                finding["code_snippet"] = chunk_info["content"]
                            per_file_agg[file_relpath]["analysis"].extend(findings)
                        elif result:
                            per_file_agg[file_relpath]["raw_outputs"].append(result.get("raw", "Analysis failed"))
                    except Exception as exc:
                        logger.error(f"Chunk aggregation for {file_relpath} generated an exception: {exc}")
                        per_file_agg[file_relpath]["raw_outputs"].append(f"Internal error: {exc}")

            # STAGE 4: Aggregate and run symbolic check
            per_file_results, risk_counts = [], {"High":0,"Medium":0,"Low":0}
            for file_obj in selected_files:
                relpath = file_obj["relpath"]
                risk_level = risk_level_from_score(file_obj["score"])
                risk_counts[risk_level] += 1
                agg_result = per_file_agg.get(relpath, {"analysis":[],"raw_outputs":[]})
                per_file_results.append({
                    "file": relpath, "risk_level": risk_level,
                    "analysis": agg_result["analysis"], "raw_outputs": agg_result["raw_outputs"]
                })
            
            all_findings = [f for res in per_file_results for f in res.get("analysis", [])]
            logger.info(f"WORKER: Running symbolic analysis on {len(all_findings)} total findings.")
            symbolic_result = build_and_check_symbolic_model(all_findings)

            # STAGE 5: Save Final Results
            out_results = {
                "summary":{
                    "scanned_files":len(source_files), "analyzed_files":len(selected_files),
                    "timestamp":int(time.time()), "high_risk_count":risk_counts["High"],
                    "medium_risk_count":risk_counts["Medium"], "low_risk_count":risk_counts["Low"]
                },
                "files": per_file_results,
                "file_hashes": file_hashes,
                "symbolic_analysis": symbolic_result
            }

            scan.results = json.loads(json.dumps(out_results, sort_keys=True))
            scan.status = "completed"; db.commit()
            logger.info(f"WORKER: Scan {scan_id} completed successfully.")

    except Exception as exc:
        logger.exception(f"WORKER: Critical error during scan {scan_id}: {exc}")
        if scan: scan.status = "failed"; scan.results = {"error": str(exc)}; db.commit()
        raise
    finally:
        db.close()
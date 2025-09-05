import os
import re
import json
import time
import hashlib
import logging
from typing import List, Dict, Tuple, Optional
import google.generativeai as genai

SUPPORTED_EXTENSIONS = ('.js', '.ts', '.py', '.go', '.rb', '.java', '.php', '.c', '.cpp', '.cs', '.h', '.hpp', '.html', '.htm', '.css', '.sql', '.rs', '.kt', '.sh', '.pl')
MAX_FILES_TO_ANALYZE = 5
MAX_PARALLEL_CHUNKS = 4
CHUNK_LINES_HIGH_RISK = 500
CHUNK_LINES_LOW_RISK = 1000
MIN_FILE_BYTES_TO_CONSIDER = 200  # ignore trivially small files
LLM_MODEL_NAME = "gemini-1.5-flash"
LLM_RETRY_COUNT = 2
LLM_RETRY_DELAY = 2

def file_hash(path: str) -> str:
    sha1 = hashlib.sha1()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha1.update(chunk)
    return sha1.hexdigest()

def detect_language_by_ext(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    return {
        ".py": "python",
        ".js": "javascript",
        ".ts": "typescript",
        ".go": "go",
        ".rb": "ruby",
        ".java": "java",
        ".php": "php",
        ".c": "c",
        ".cpp": "cpp",
        ".cs": "csharp",
        ".rs": "rust",
        ".kt": "kotlin",
    }.get(ext, "unknown")

def extract_functions_by_language(code: str, language: str) -> list[str]:
    # simplified placeholder — can expand with regexes per language
    return code.splitlines()

def chunk_by_function_boundaries(code: str, language: str, high_risk: bool) -> list[str]:
    lines = code.splitlines()
    size = CHUNK_LINES_HIGH_RISK if high_risk else CHUNK_LINES_LOW_RISK
    return ["\n".join(lines[i:i+size]) for i in range(0, len(lines), size)]

def heuristic_risk_score(path: str, size: int, content_head: str) -> int:
    fname = os.path.basename(path).lower()
    score = 0
    if any(k in fname for k in ["api", "auth", "controller", "service", "route"]):
        score += 5
    if size > 10000:
        score += 2
    if "password" in content_head or "secret" in content_head:
        score += 3
    return score

def llm_analyze_chunk(prompt: str) -> dict:
    import google.generativeai as genai
    model = genai.GenerativeModel(LLM_MODEL_NAME)
    try:
        resp = model.generate_content(prompt)
        cleaned = resp.text.strip().replace("```json", "").replace("```", "")
        return {"ok": True, "json": json.loads(cleaned), "raw": cleaned}
    except Exception as e:
        return {"ok": False, "error": str(e), "raw": str(resp) if "resp" in locals() else ""}
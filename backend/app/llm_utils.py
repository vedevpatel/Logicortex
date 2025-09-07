import os
import re
import json
import time
import hashlib
import logging
from typing import List, Dict, Set
import openai
#import google.generativeai as genai
from app.core.config import settings

# --- Configuration ---
LLM_MODEL_NAME = "gemini-1.5-flash"
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 2

# Heuristic & Selection Constants
SUPPORTED_EXTENSIONS = ('.js', '.ts', '.py', '.go', '.rb', '.java', '.php', '.c', '.cpp', '.cs', '.h', '.hpp', '.rs', '.kt')
MIN_FILE_BYTES_TO_CONSIDER = 200

# Chunking Constants
CHUNK_FALLBACK_SIZE = 4000
CHUNK_OVERLAP = 400

# --- 1. Heuristics & Pre-Analysis Utilities ---

def heuristic_risk_score(path: str, size: int, content_head: str) -> int:
    if "llm_utils.py" in path:
        return 0

    score = 0
    path_lower = path.lower()
    content_lower = content_head.lower()
    HIGH_RISK_KEYWORDS = [
        "auth", "permission", "role", "jwt", "token", "session", "login", "logout",
        "payment", "billing", "stripe", "credit", "card", "transaction",
        "admin", "sudo", "impersonate", "access", "control",
        "secret", "apikey", "api_key", "password",
        "pii", "ssn", "personal", "user",
        "delete", "remove", "destroy", "update", "modify"
    ]
    for keyword in HIGH_RISK_KEYWORDS:
        if keyword in path_lower: score += 8
        if keyword in content_lower: score += 2
    if any(k in path_lower for k in ["/api/", "/routes/", "/controllers/", "/services/"]):
        score += 10
    if size > 50000: score += 5
    elif size > 10000: score += 2
    return score

def detect_language_by_ext(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    return {
        ".py": "python", ".js": "javascript", ".ts": "typescript",
        ".go": "go", ".rb": "ruby", ".java": "java", ".php": "php",
        ".c": "c", ".cpp": "cpp", ".cs": "csharp", ".rs": "rust", ".kt": "kotlin",
    }.get(ext, "unknown")

def extract_definitions_by_language(code: str, language: str) -> Set[str]:
    patterns = {
        'python': r'^\s*(?:def|class)\s+([a-zA-Z_]\w*)',
        'javascript': r'^\s*(?:function|class|const|let|var)\s+([a-zA-Z_$]\w*)\s*(?:=|\(|\{|extends)',
        'typescript': r'^\s*(?:export\s+)?(?:async\s+)?(?:function|class|const|let|var|interface|type)\s+([a-zA-Z_$]\w*)',
        'go': r'^\s*func\s+(?:\([^)]+\)\s*)?([a-zA-Z_]\w*)',
        'java': r'^\s*(?:public|private|protected)?\s*(?:static\s+|final\s+)?(class|interface|enum|@interface)\s+([A-Z]\w*)|^\s*(?:public|private|protected)?\s*[\w\.<>\[\]]+\s+([a-z]\w*)\s*\(',
        'ruby': r'^\s*(?:def|class|module)\s+([a-zA-Z_]\w*)',
    }
    pattern = patterns.get(language)
    if not pattern: return set()
    definitions = set()
    for line in code.splitlines():
        match = re.search(pattern, line)
        if match:
            for group in match.groups():
                if group and not group.isspace():
                    definitions.add(group)
                    break
    return definitions

def find_usages(definitions: Set[str], files_to_search: List[str]) -> Set[str]:
    if not definitions: return set()
    dependent_files = set()
    pattern = re.compile(r'\b(' + '|'.join(re.escape(d) for d in definitions) + r')\b')
    for file_path in files_to_search:
        try:
            with open(file_path, 'r', errors='ignore') as f:
                content = f.read()
                if pattern.search(content):
                    dependent_files.add(file_path)
        except Exception:
            continue
    return dependent_files

# --- 2. Deterministic Chunking & Hashing ---

def stable_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()

def chunk_semantically(code: str, language: str) -> List[str]:
    patterns = {
        'python': r'\n\s*(?:def|class)\s+',
        'javascript': r'\n\s*(?:function|class|const|let|var)\s+[\w\$]+\s*(?:=|\()',
        'typescript': r'\n\s*(?:export\s+)?(?:async\s+)?(?:function|class|const|let|var|interface|type)\s+',
    }
    pattern = patterns.get(language)
    if not pattern or not code: return []
    split_chunks = re.split(f'({pattern})', code)
    if len(split_chunks) <= 1: return []
    result_chunks = [split_chunks[0]]
    for i in range(1, len(split_chunks), 2):
        result_chunks.append(split_chunks[i] + split_chunks[i+1])
    return [chunk.strip() for chunk in result_chunks if chunk and not chunk.isspace()]

def robust_chunker(content: str, language: str) -> List[str]:
    semantic_chunks = chunk_semantically(content, language)
    if semantic_chunks: return semantic_chunks
    if not content: return []
    chunks = []
    start = 0
    while start < len(content):
        end = min(len(content), start + CHUNK_FALLBACK_SIZE)
        chunk = content[start:end]
        chunks.append(chunk)
        if end == len(content): break
        start += CHUNK_FALLBACK_SIZE - CHUNK_OVERLAP
    return chunks

# --- 3. LLM Interaction ---

def build_prompt(filename: str, code_chunk: str) -> str:
    return (
        "You are a deterministic, expert application-security analyst. Your task is to find business logic vulnerabilities. "
        "Analyze the provided code chunk and RETURN ONLY A VALID JSON OBJECT parsable by Python's `json.loads()`.\n\n"
        "The JSON schema you must follow is:\n"
        "{\"analysis\": [ {\"function_name\": str|null, \"required_role\": \"owner\"|\"admin\"|\"member\"|\"public\"|null, "
        "\"severity\": \"critical\"|\"high\"|\"medium\"|\"low\", \"issue\": str, \"notes\": str} ] }\n\n"
        f"File: {filename}\n"
        "Code:\n```\n"
        f"{code_chunk}\n"
        "```\n\n"
        "Be precise and conservative. If there are no clear business logic issues, return {\"analysis\": []}."
    )

def analyze_chunk_with_llm(prompt: str) -> Dict:
    """
    Calls a local Ollama model using the OpenAI-compatible API.
    Uses JSON Mode for reliable output.
    """
    try:
        # Initialize the client to point to the local Ollama server
        client = openai.OpenAI(
            base_url=settings.OLLAMA_BASE_URL,
            api_key='ollama',  # required but not used by Ollama
        )
        
        # Call the chat completions API with JSON Mode enabled
        response = client.chat.completions.create(
            model=settings.OLLAMA_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            response_format={"type": "json_object"},
        )
        
        response_text = response.choices[0].message.content
        return {"ok": True, "json": json.loads(response_text), "raw": response_text}

    except Exception as e:
        logging.error(f"Ollama call failed: {e}")
        # Return a consistent error format if all retries fail (retry logic can be added here if needed)
        return {"ok": False, "json": None, "raw": "", "error": str(e)}

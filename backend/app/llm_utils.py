import os
import re
import json
import hashlib
import logging
from typing import List, Dict, Set
import openai
from app.core.config import settings
import time

LLM_MODEL_NAME = "gemini-1.5-flash"
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 2

SUPPORTED_EXTENSIONS = ('.js', '.ts', '.py', '.go', '.rb', '.java', '.php', '.c', '.cpp', '.cs', '.h', '.hpp', '.rs', '.kt')
MIN_FILE_BYTES_TO_CONSIDER = 200

CHUNK_FALLBACK_SIZE = 4000
CHUNK_OVERLAP = 400

logger = logging.getLogger(__name__)

# -------------------- Heuristics --------------------

def heuristic_risk_score(path: str, size: int, content_head: str) -> int:
    if "llm_utils.py" in path: return 0

    score = 0
    path_lower, content_lower = path.lower(), content_head.lower()
    HIGH_RISK_KEYWORDS = [
        "auth","permission","role","jwt","token","session","login","logout",
        "payment","billing","stripe","credit","card","transaction",
        "admin","sudo","impersonate","access","control",
        "secret","apikey","api_key","password",
        "pii","ssn","personal","user",
        "delete","remove","destroy","update","modify"
    ]
    for k in HIGH_RISK_KEYWORDS:
        if k in path_lower: score += 8
        if k in content_lower: score += 2
    if any(p in path_lower for p in ["/api/","/routes/","/controllers/","/services/"]): score += 10
    if size > 50000: score += 5
    elif size > 10000: score += 2
    return score

def detect_language_by_ext(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    return {
        ".py":"python",".js":"javascript",".ts":"typescript",
        ".go":"go",".rb":"ruby",".java":"java",".php":"php",
        ".c":"c",".cpp":"cpp",".cs":"csharp",".rs":"rust",".kt":"kotlin",
    }.get(ext,"unknown")

def extract_definitions_by_language(code: str, language: str) -> Set[str]:
    patterns = {
        'python': r'^\s*(?:def|class)\s+([a-zA-Z_]\w*)',
        'javascript': r'^\s*(?:function|class|const|let|var)\s+([a-zA-Z_$]\w*)\s*(?:=|\(|\{|extends)',
        'typescript': r'^\s*(?:export\s+)?(?:async\s+)?(?:function|class|const|let|var|interface|type)\s+([a-zA-Z_$]\w*)',
        'go': r'^\s*func\s+(?:\([^)]+\)\s*)?([a-zA-Z_]\w*)',
        'java': r'^\s*(?:public|private|protected)?\s*(?:static\s+|final\s+)?(class|interface|enum|@interface)\s+([A-Z]\w*)|^\s*(?:public|private|protected)?\s*[\w\.<>\[\]]+\s+([a-z]\w*)\s*\(',
        'ruby': r'^\s*(?:def|class|module)\s+([a-zA-Z_]\w*)',
        'php': r'^\s*(?:function|class|interface|trait)\s+([a-zA-Z_]\w*)',
        'c': r'^\s*[\w\*\s]+\s+([a-zA-Z_]\w*)\s*\(.*\)\s*\{',
        'cpp': r'^\s*[\w\:\<\>\*\s]+\s+([a-zA-Z_]\w*)\s*\(.*\)\s*(?:const)?\s*\{',
        'csharp': r'^\s*(?:public|private|protected|internal)?\s*(?:static\s+|virtual\s+|override\s+|abstract\s+)?(?:class|interface|struct|enum)\s+([A-Z]\w*)|^\s*(?:public|private|protected|internal)?\s*[\w\<\>\[\]]+\s+([a-zA-Z_]\w*)\s*\(',
        'rust': r'^\s*(?:fn|struct|enum|trait|impl)\s+([a-zA-Z_]\w*)',
        'kotlin': r'^\s*(?:fun|class|interface|object|data\s+class|sealed\s+class)\s+([a-zA-Z_]\w*)',
    }
    pattern = patterns.get(language)
    if not pattern: return set()
    definitions = set()
    for line in code.splitlines():
        match = re.search(pattern, line)
        if match:
            for g in match.groups():
                if g and not g.isspace():
                    definitions.add(g)
                    break
    return definitions

def find_usages(definitions: Set[str], files_to_search: List[str]) -> Set[str]:
    if not definitions: return set()
    dependent_files = set()
    pattern = re.compile(r'\b(' + '|'.join(re.escape(d) for d in definitions) + r')\b')
    for file_path in files_to_search:
        try:
            with open(file_path, 'r', errors='ignore') as f:
                if pattern.search(f.read()):
                    dependent_files.add(file_path)
        except Exception:
            continue
    return dependent_files

# -------------------- Chunking & Hashing --------------------

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
    return [c.strip() for c in result_chunks if c and not c.isspace()]

def robust_chunker(content: str, language: str) -> List[str]:
    semantic_chunks = chunk_semantically(content, language)
    if semantic_chunks: return semantic_chunks
    if not content: return []
    chunks, start = [], 0
    while start < len(content):
        end = min(len(content), start + CHUNK_FALLBACK_SIZE)
        chunks.append(content[start:end])
        if end == len(content): break
        start += CHUNK_FALLBACK_SIZE - CHUNK_OVERLAP
    return chunks

# -------------------- LLM Interaction --------------------    
def build_prompt(filename: str, code_chunk: str) -> str:
    """Builds a single, unified prompt for a capable model like Mistral."""
    return (
        "You are a hyper-vigilant security auditor. Your task is to find potential business logic flaws in code "
        "and convert them into a structured format. Follow these rules strictly:\n\n"
        "1. **Output Format**: Return ONLY a valid JSON object: `{\"analysis\": [ ... ]}`.\n"
        "2. **Finding Object Schema**: Each object in the 'analysis' array must have:\n"
        "   - `issue`: A brief, descriptive title for the vulnerability.\n"
        "   - `notes`: A user-friendly explanation of the risk.\n"
        "   - `severity`: One of 'high', 'medium', or 'low'.\n"
        "   - `required_role`: The role associated with the finding, if any.\n"
        "   - `z3_assertion`: The Z3 assertion string, e.g., `(assert (HasPermission <role> <action> <resource>))` or null.\n"
        "3. **Strictness**: If there are no clear issues, you MUST return `{\"analysis\": []}`.\n\n"
        "Task: Process the following code chunk and return the JSON object.\n\n"
        f"File: {filename}\n"
        "Code:\n```\n"
        f"{code_chunk}\n"
        "```"
    )

def analyze_chunk_with_llm(prompt: str, model_name: str) -> Dict:
    """
    Calls a specified local Ollama model with robust parsing and retry logic.
    """
    for attempt in range(MAX_RETRIES):
        try:
            client = openai.OpenAI(base_url=settings.OLLAMA_BASE_URL, api_key='ollama')
            response = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
                # Note: We can't solely rely on response_format, as smaller models may still make errors.
                response_format={"type": "json_object"}, 
            )
            response_text = response.choices[0].message.content

            # --- NEW: Resilient JSON parsing logic ---
            # Use regex to find the JSON blob, even if there's extra text around it.
            # The re.DOTALL flag allows '.' to match newlines.
            match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if match:
                json_str = match.group(0)
                loaded_json = json.loads(json_str)
                # Basic validation that we got the expected structure
                if 'analysis' not in loaded_json and 'rules' not in loaded_json:
                    raise ValueError("LLM response is missing 'analysis' or 'rules' array.")
                return {"ok": True, "json": loaded_json, "raw": json_str}
            else:
                raise ValueError("No valid JSON object found in the LLM response.")

        except Exception as e:
            logging.warning(f"Ollama call/parse failed on attempt {attempt + 1}/{MAX_RETRIES}: {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY_SECONDS)
                continue
            return {"ok": False, "json": None, "raw": response_text if 'response_text' in locals() else "", "error": str(e)}

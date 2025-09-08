import logging
import time
import openai
from app.core.config import settings

logger = logging.getLogger(__name__)

def build_remediation_prompt(issue: str, code: str) -> str:
    """Builds a prompt to instruct the LLM to fix a vulnerability."""
    return (
        "You are an expert software engineer specializing in security. Your task is to fix a vulnerability in a given code snippet. "
        "Read the issue description and the vulnerable code, and then provide a corrected version of the code. "
        "RETURN ONLY THE CORRECTED CODE SNIPPET, with no explanations, apologies, or introductory text.\n\n"
        f"Vulnerability: \"{issue}\"\n\n"
        "Vulnerable Code:\n"
        "```\n"
        f"{code}\n"
        "```\n\n"
        "Corrected Code:"
    )

async def generate_fix_suggestion(issue: str, code: str) -> str:
    """Generates a code fix using a powerful LLM, handling raw text output."""
    prompt = build_remediation_prompt(issue, code)
    
    try:
        # This is a dedicated client call that does NOT expect JSON
        client = openai.OpenAI(base_url=settings.OLLAMA_BASE_URL, api_key='ollama')
        response = client.chat.completions.create(
            model=settings.OLLAMA_MODEL, # Use the single, primary model
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            # We DO NOT use response_format={"type": "json_object"} here
        )
        
        corrected_code = response.choices[0].message.content.strip()
        
        # Clean up any markdown code blocks the AI might add
        if corrected_code.startswith("```"):
            corrected_code = corrected_code.split('\n', 1)[-1]
        if corrected_code.endswith("```"):
            corrected_code = corrected_code.rsplit('\n', 1)[0]
            
        return corrected_code if corrected_code else "AI could not generate a valid fix."

    except Exception as e:
        logger.error(f"Remediation LLM call failed: {e}")
        return f"Error from AI model: {str(e)}"
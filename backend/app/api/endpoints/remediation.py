from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.remediation_engine import generate_fix_suggestion
from app.api.deps import get_current_user
from app.db.models.user import User

router = APIRouter()

class RemediationRequest(BaseModel):
    issue_description: str
    code_snippet: str

class RemediationResponse(BaseModel):
    suggested_fix: str

@router.post("/suggest-fix", response_model=RemediationResponse)
async def suggest_fix(request: RemediationRequest, current_user: User = Depends(get_current_user)):
    """
    Receives a code snippet and issue, and returns an AI-generated fix.
    This is a protected endpoint.
    """
    if not request.code_snippet or not request.issue_description:
        raise HTTPException(status_code=400, detail="Code snippet and issue description are required.")
    
    try:
        suggested_code = await generate_fix_suggestion(
            request.issue_description,
            request.code_snippet
        )
        if "Error from AI model" in suggested_code:
             raise HTTPException(status_code=503, detail=suggested_code)

        return RemediationResponse(suggested_fix=suggested_code)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestion: {str(e)}")
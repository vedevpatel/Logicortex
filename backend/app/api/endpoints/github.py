from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx
import jwt
import time

from app.core.config import settings
from app.api.deps import get_current_user
from app.db.models.user import User
from app.api.endpoints.auth import get_db
from app.schemas.github import GitHubInstallation
from app.schemas.organization import Organization as OrganizationSchema

router = APIRouter()

def create_github_jwt() -> str:
    """Creates a JWT to authenticate as the GitHub App."""
    now = int(time.time())
    payload = {
        "iat": now,
        "exp": now + 600,  # 10 minutes
        "iss": settings.GITHUB_APP_ID,
    }
    return jwt.encode(payload, settings.GITHUB_PRIVATE_KEY, algorithm="RS256")

@router.get("/install-url")
def get_github_install_url(current_user: User = Depends(get_current_user)):
    """Returns the URL for a user to install the GitHub App."""
    install_url = "https://github.com/apps/logicortex/installations/new"
    return {"install_url": install_url}

@router.post("/installation-complete", response_model=OrganizationSchema)
def github_installation_complete(
    payload: GitHubInstallation,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Links a GitHub App installation and returns the updated organization."""
    if not current_user.organizations:
        raise HTTPException(status_code=404, detail="User has no organization")

    organization = current_user.organizations[0]
    
    organization.github_installation_id = payload.installation_id
    
    db.add(organization)
    db.commit()
    db.refresh(organization)
    
    return organization


@router.get("/installation-management-url")
def get_github_installation_management_url(
    current_user: User = Depends(get_current_user)
):
    """
    Returns the URL for the user to manage their GitHub App installation
    (e.g., to add or remove repositories).
    """
    if not current_user.organizations or not current_user.organizations[0].github_installation_id:
        raise HTTPException(
            status_code=400,
            detail="GitHub App not installed for this organization."
        )
    
    installation_id = current_user.organizations[0].github_installation_id
    # This is the standard GitHub URL format for managing an installation
    management_url = f"https://github.com/settings/installations/{installation_id}"
    return {"management_url": management_url}



@router.get("/repositories")
async def get_github_repositories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches repositories the GitHub App has access to for the user's organization."""
    if not current_user.organizations or not current_user.organizations[0].github_installation_id:
        raise HTTPException(
            status_code=400,
            detail="GitHub App not installed for this organization."
        )

    organization = current_user.organizations[0]
    installation_id = organization.github_installation_id
    app_jwt = create_github_jwt()
    
    async with httpx.AsyncClient() as client:
        # Step 1: Get installation access token
        token_url = f"https://api.github.com/app/installations/{installation_id}/access_tokens"
        token_headers = {
            "Authorization": f"Bearer {app_jwt}",
            "Accept": "application/vnd.github.v3+json",
        }
        token_response = await client.post(token_url, headers=token_headers)
        
        # handling of invalid/revoked installations ---
        if token_response.status_code in [401, 403, 404]:
            organization.github_installation_id = None
            db.add(organization)
            db.commit()
            raise HTTPException(
                status_code=404, 
                detail="GitHub installation not found or access has been revoked. Please reconnect."
            )

        if token_response.status_code != 201:
            raise HTTPException(
                status_code=500,
                detail=f"Could not create installation access token: {token_response.text}"
            )
        
        installation_token = token_response.json().get("token")
        if not installation_token:
            raise HTTPException(
                status_code=500,
                detail="Installation token missing in GitHub response."
            )

        # Step 2: Fetch repositories using the installation token
        repo_url = "https://api.github.com/installation/repositories"
        repo_headers = {
            "Authorization": f"token {installation_token}",  # ✅ correct format
            "Accept": "application/vnd.github.v3+json",
        }
        repo_response = await client.get(repo_url, headers=repo_headers)
        
        if repo_response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail=f"Could not fetch repositories from GitHub: {repo_response.text}"
            )

    return repo_response.json()


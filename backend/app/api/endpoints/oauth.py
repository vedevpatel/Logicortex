import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core import security
from app.db import session
from app.db.models.user import User
from app.api.endpoints.auth import get_db

router = APIRouter()

@router.get("/github/login")
async def github_login():
    """Redirects the user to GitHub for authentication."""
    github_auth_url = (
        f"https://github.com/login/oauth/authorize?client_id={settings.GITHUB_CLIENT_ID}"
        "&scope=user:email"
    )
    return RedirectResponse(url=github_auth_url)

@router.get("/github/callback")
async def github_callback(code: str, db: Session = Depends(get_db)):
    """Handles the callback from GitHub, creates user, and issues a JWT."""
    token_url = "https://github.com/login/oauth/access_token"
    user_url = "https://api.github.com/user"
    user_emails_url = "https://api.github.com/user/emails"

    async with httpx.AsyncClient() as client:
        # Exchange code for access token
        token_response = await client.post(
            token_url,
            json={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        token_data = token_response.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="Could not get GitHub token")

        # Get user's primary email
        headers = {"Authorization": f"Bearer {access_token}"}
        emails_response = await client.get(user_emails_url, headers=headers)
        emails = emails_response.json()
        primary_email = next((email["email"] for email in emails if email["primary"]), None)
        
        if not primary_email:
            raise HTTPException(status_code=400, detail="Could not get primary email from GitHub")

    # Check if user exists, or create a new one
    user = db.query(User).filter(User.email == primary_email).first()
    if not user:
        user = User(email=primary_email, provider="github")
        db.add(user)
        db.commit()
        db.refresh(user)

    # Create our application's JWT
    app_jwt = security.create_access_token(data={"sub": user.email})
    
    # Redirect to the frontend with our token
    frontend_redirect_url = f"http://localhost:3000/auth/callback?token={app_jwt}"
    return RedirectResponse(url=frontend_redirect_url)


@router.get("/google/login")
async def google_login():
    """Redirects user to Google for authentication."""
    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.GOOGLE_CLIENT_ID}"
        "&redirect_uri=http://localhost:8000/api/v1/auth/google/callback"
        "&response_type=code"
        "&scope=openid%20email%20profile"
    )
    return RedirectResponse(url=google_auth_url)


@router.get("/google/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    """Handles callback from Google, creates user, and issues a JWT."""
    token_url = "https://oauth2.googleapis.com/token"
    user_info_url = "https://www.googleapis.com/oauth2/v1/userinfo"

    async with httpx.AsyncClient() as client:
        # Exchange code for access token
        token_response = await client.post(
            token_url,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": "http://localhost:8000/api/v1/auth/google/callback",
                "grant_type": "authorization_code",
            },
        )
        token_data = token_response.json()
        access_token = token_data.get("access_token")

        if not access_token:
            raise HTTPException(status_code=400, detail="Could not get Google token")
        
        # Get user info
        headers = {"Authorization": f"Bearer {access_token}"}
        user_info_response = await client.get(user_info_url, headers=headers)
        user_info = user_info_response.json()
        email = user_info.get("email")

    if not email:
        raise HTTPException(status_code=400, detail="Could not get email from Google")
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, provider="google")
        db.add(user)
        db.commit()
        db.refresh(user)

    app_jwt = security.create_access_token(data={"sub": user.email})
    frontend_redirect_url = f"http://localhost:3000/auth/callback?token={app_jwt}"
    return RedirectResponse(url=frontend_redirect_url)
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core import security
from app.db import session
from app.db.models.user import User
from app.db.models.organization import Organization
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
    """Handles the callback from GitHub, creates a user if needed, and issues a JWT."""
    token_url = "https://github.com/login/oauth/access_token"
    user_emails_url = "https://api.github.com/user/emails"

    async with httpx.AsyncClient() as client:
        # Step 1: Exchange the temporary code for an access token
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
            raise HTTPException(status_code=400, detail="Could not obtain GitHub access token")

        # Step 2: Use the access token to get the user's primary email
        headers = {"Authorization": f"Bearer {access_token}"}
        emails_response = await client.get(user_emails_url, headers=headers)
        emails = emails_response.json()
        primary_email = next((email["email"] for email in emails if email["primary"]), None)
        
        if not primary_email:
            raise HTTPException(status_code=400, detail="Could not retrieve primary email from GitHub")

    # Step 3: Check if the user exists in our database, or create them
    user = db.query(User).filter(User.email == primary_email).first()
    if not user:
        user = User(email=primary_email, provider="github")
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create a default organization for the new user
        new_org = Organization(name=f"{primary_email.split('@')[0]}'s Team", owner_id=user.id)
        new_org.members.append(user)
        db.add(new_org)
        db.commit()

    # Step 4: Create our own application JWT for the user
    app_jwt = security.create_access_token(data={"sub": user.email})
    
    # Step 5: Redirect the user back to the frontend with our JWT
    frontend_redirect_url = f"http://localhost:3000/auth/callback?token={app_jwt}"
    return RedirectResponse(url=frontend_redirect_url)


@router.get("/google/login")
async def google_login():
    """Redirects the user to Google for authentication."""
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
    """Handles the callback from Google, creates a user if needed, and issues a JWT."""
    token_url = "https://oauth2.googleapis.com/token"
    user_info_url = "https://www.googleapis.com/oauth2/v1/userinfo"

    async with httpx.AsyncClient() as client:
        # Step 1: Exchange the temporary code for an access token
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
            raise HTTPException(status_code=400, detail="Could not obtain Google access token")
        
        # Step 2: Use the access token to get the user's info
        headers = {"Authorization": f"Bearer {access_token}"}
        user_info_response = await client.get(user_info_url, headers=headers)
        user_info = user_info_response.json()
        email = user_info.get("email")

    if not email:
        raise HTTPException(status_code=400, detail="Could not retrieve email from Google")
        
    # Step 3: Check if the user exists in our database, or create them
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, provider="google")
        db.add(user)
        db.commit()
        db.refresh(user)

        # Step 4: Create a default organization for the new user
        new_org = Organization(name=f"{email.split('@')[0]}'s Team", owner_id=user.id)
        new_org.members.append(user)
        db.add(new_org)
        db.commit()

    # Step 5: Create our own application JWT for the user
    app_jwt = security.create_access_token(data={"sub": user.email})

    # Step 6: Redirect the user back to the frontend with our JWT
    frontend_redirect_url = f"http://localhost:3000/auth/callback?token={app_jwt}"
    return RedirectResponse(url=frontend_redirect_url)
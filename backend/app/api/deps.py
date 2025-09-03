from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db import session
from app.db.models.user import User
from app.db.models.organization import user_organization_association

def get_db():
    db = session.SessionLocal()
    try:
        yield db
    finally:
        db.close()

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"/api/v1/auth/login"
)

def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(reusable_oauth2)
) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        email = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials - no email",
            )
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials - invalid token",
        )
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def get_current_active_admin(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Dependency to get the current user and check if they are an admin or owner
    of their primary organization.
    """
    if not current_user.organizations:
        raise HTTPException(status_code=403, detail="User is not part of an organization")

    organization = current_user.organizations[0]
    stmt = db.query(user_organization_association.c.role).filter(
        user_organization_association.c.user_id == current_user.id,
        user_organization_association.c.organization_id == organization.id
    ).first()
    
    if not stmt or stmt.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return current_user
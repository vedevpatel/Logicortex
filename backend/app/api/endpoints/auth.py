from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta

from app.db import session
from app.db.models import user as user_model
from app.db.models.organization import Organization
from app.schemas import user as user_schema, token as token_schema
from app.core.config import settings
from app.core import security
from app.db.models.organization import Organization, user_organization_association
from app.api.deps import get_db

router = APIRouter()


@router.post("/register", response_model=user_schema.User)
def register_user(user: user_schema.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(user_model.User).filter(user_model.User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Create the user object
    hashed_password = security.get_password_hash(user.password)
    db_user = user_model.User(email=user.email, hashed_password=hashed_password, provider="email")
    db.add(db_user)
    
    # Create the organization and set the new user as the owner
    new_org = Organization(name=f"{user.email.split('@')[0]}'s Team", owner=db_user)
    db.add(new_org)

    # We must commit here to get IDs for the user and organization
    db.commit()
    
    # Now, explicitly create the link with the 'owner' role
    stmt = user_organization_association.insert().values(
        user_id=db_user.id,
        organization_id=new_org.id,
        role='owner'
    )
    db.execute(stmt)
    db.commit()
    
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=token_schema.Token)
def login_for_access_token(form_data: user_schema.UserCreate, db: Session = Depends(get_db)):
    user = db.query(user_model.User).filter(user_model.User.email == form_data.email).first()
    # Updated to check for user.hashed_password to avoid errors with social logins
    if not user or not user.hashed_password or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
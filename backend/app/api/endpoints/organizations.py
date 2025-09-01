from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_current_user # We will create this dependency next
from app.db.models.user import User
from app.schemas.organization import Organization

router = APIRouter()

@router.get("/me", response_model=List[Organization])
def read_user_organizations(
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve the organizations the current user is a member of.
    """
    if not current_user.organizations:
        return []
    return current_user.organizations
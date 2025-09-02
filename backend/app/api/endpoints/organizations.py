from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_current_user, get_db
from app.db.models.user import User
from app.db.models.organization import Organization
from app.schemas.organization import Organization as OrganizationSchema

router = APIRouter()

@router.get("/me", response_model=List[OrganizationSchema])
def read_user_organizations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve organizations for the current user with a fresh DB query.
    """
    orgs = (
        db.query(Organization)
        .join(Organization.members)
        .filter(User.id == current_user.id)
        .all()
    )
    return orgs

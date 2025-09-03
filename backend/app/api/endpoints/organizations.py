from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.models.user import User
from app.db.models.organization import Organization, user_organization_association
from app.schemas.organization import Organization as OrganizationSchema
from app.schemas.member import Member as MemberSchema, MemberUpdate, MemberInvite
from app.api.deps import get_db, get_current_user, get_current_active_admin # <-- CHANGE THIS IMPORT


router = APIRouter()

@router.get("/me", response_model=List[OrganizationSchema])
def read_user_organizations(current_user: User = Depends(get_current_user)):
    """Retrieve the organizations the current user is a member of."""
    if not current_user.organizations:
        return []
    return current_user.organizations

@router.get("/me/members", response_model=List[MemberSchema])
def read_organization_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all members of the user's primary organization."""
    if not current_user.organizations:
        return []
    organization = current_user.organizations[0]
    
    members_with_roles = []
    for member in organization.members:
        result = db.query(user_organization_association.c.role).filter(
            user_organization_association.c.user_id == member.id,
            user_organization_association.c.organization_id == organization.id
        ).first()
        role = result[0] if result else "member"
        members_with_roles.append({"id": member.id, "email": member.email, "role": role})

    return members_with_roles

@router.post("/me/members", response_model=MemberSchema)
def invite_member(
    invite: MemberInvite,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_active_admin)
):
    """Invite a new member to the organization (admins only)."""
    organization = admin_user.organizations[0]
    user_to_add = db.query(User).filter(User.email == invite.email).first()
    if not user_to_add:
        raise HTTPException(status_code=404, detail="User with this email not found in the system.")

    if user_to_add in organization.members:
        raise HTTPException(status_code=400, detail="User is already a member of this organization.")

    # Using the association table's insert method is the correct way to add a member with a role
    insert_stmt = user_organization_association.insert().values(
        user_id=user_to_add.id, 
        organization_id=organization.id, 
        role=invite.role
    )
    db.execute(insert_stmt)
    db.commit()
    
    return {"id": user_to_add.id, "email": user_to_add.email, "role": invite.role}
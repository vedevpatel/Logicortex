from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_user, get_current_active_admin 
from app.db.models.user import User
from app.db.models.scan import Scan
from app.schemas.scan import Scan as ScanSchema, ScanCreate
from app.api.endpoints.auth import get_db
from app.worker import run_scan

router = APIRouter()

@router.post("/", response_model=ScanSchema, status_code=status.HTTP_201_CREATED)
def create_scan(
    scan_in: ScanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new scan and trigger the background worker.
    """
    if not current_user.organizations:
        raise HTTPException(status_code=403, detail="User is not part of an organization.")
    
    organization = current_user.organizations[0]
    
    new_scan = Scan(
        repository_name=scan_in.repository_name,
        organization_id=organization.id,
        status="pending"
    )
    db.add(new_scan)
    db.commit()
    db.refresh(new_scan)
    
    # Trigger the background job
    run_scan.delay(new_scan.id)
    
    return new_scan

@router.get("/", response_model=List[ScanSchema])
def get_organization_scans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all scans for the user's current organization.
    """
    if not current_user.organizations:
        return []
    
    organization = current_user.organizations[0]
    return db.query(Scan).filter(Scan.organization_id == organization.id).order_by(Scan.created_at.desc()).all()
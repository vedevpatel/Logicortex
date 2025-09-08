from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.db.models.finding import Finding, FindingStatus
from pydantic import BaseModel

router = APIRouter()

class TriageUpdateRequest(BaseModel):
    status: FindingStatus

@router.patch("/{finding_id}/triage", status_code=204)
def triage_finding(
    finding_id: int,
    update_data: TriageUpdateRequest,
    db: Session = Depends(deps.get_db),
    # Add dependency for current user to ensure authorization
):
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    
    # Here you would add a check to ensure the user is part of the org that owns the scan
    
    finding.status = update_data.status
    db.commit()
    return
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class ScanBase(BaseModel):
    repository_name: str

class ScanCreate(ScanBase):
    pass

class Scan(ScanBase):
    id: int
    status: str
    organization_id: int
    results: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
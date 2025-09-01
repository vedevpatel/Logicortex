from pydantic import BaseModel
from typing import Optional

class OrganizationBase(BaseModel):
    name: str

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None

class Organization(OrganizationBase):
    id: int
    owner_id: int

    class Config:
        from_attributes = True

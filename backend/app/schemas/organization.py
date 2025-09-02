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
    github_installation_id: Optional[int] = None

    class Config:
        from_attributes = True

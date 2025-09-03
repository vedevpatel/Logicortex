from pydantic import BaseModel, EmailStr
from typing import Optional

class Member(BaseModel):
    id: int
    email: EmailStr
    role: str

    class Config:
        from_attributes = True

class MemberUpdate(BaseModel):
    role: str

class MemberInvite(BaseModel):
    email: EmailStr
    role: str = "member"
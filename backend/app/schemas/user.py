from pydantic import BaseModel, EmailStr

# Schema for creating a new user (input)
class UserCreate(BaseModel):
    email: EmailStr
    password: str

# Schema for reading a user (output, password excluded)
class User(BaseModel):
    id: int
    email: EmailStr

    class Config:
        from_attributes = True
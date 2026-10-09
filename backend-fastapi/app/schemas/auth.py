from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class Token(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int = 86400
    user_id: int
    email: str
    role: str

class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None
    role: Optional[str] = None

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password at least 6 characters")
    role: str = Field(default="PASSENGER", description="PASSENGER, DRIVER, OPERATOR, ADMIN")
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True

    class Config:
        from_attributes = True

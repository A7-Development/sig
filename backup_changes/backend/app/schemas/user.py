from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    name: str
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    name: str | None = None
    password: str | None = None
    is_active: bool | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: UUID
    is_superadmin: bool
    created_at: datetime
    updated_at: datetime
    roles: list["RoleBasic"] = []

    class Config:
        from_attributes = True


class RoleBasic(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True


# Update forward reference
UserResponse.model_rebuild()


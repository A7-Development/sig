from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class RoleBase(BaseModel):
    name: str
    description: str | None = None


class RoleCreate(RoleBase):
    permission_ids: list[UUID] = []


class RoleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    permission_ids: list[UUID] | None = None


class RoleResponse(RoleBase):
    id: UUID
    created_at: datetime
    permissions: list["PermissionBasic"] = []

    class Config:
        from_attributes = True


class PermissionBasic(BaseModel):
    id: UUID
    action: str
    resource: str
    module_code: str | None = None

    class Config:
        from_attributes = True


# Update forward reference
RoleResponse.model_rebuild()


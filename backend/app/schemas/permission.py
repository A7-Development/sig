from pydantic import BaseModel
from uuid import UUID


class PermissionResponse(BaseModel):
    id: UUID
    module_id: UUID
    action: str
    resource: str
    description: str | None

    class Config:
        from_attributes = True


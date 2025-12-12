from pydantic import BaseModel
from uuid import UUID


class ModuleResponse(BaseModel):
    id: UUID
    code: str
    name: str
    description: str | None
    icon: str | None
    order: str
    is_active: bool

    class Config:
        from_attributes = True


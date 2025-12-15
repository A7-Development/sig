from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import User, Module, Permission
from app.schemas import ModuleResponse, PermissionResponse
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/modules", tags=["Modules"])


@router.get("/", response_model=list[ModuleResponse])
async def list_modules(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_active_user)
):
    """List all active modules."""
    result = await db.execute(
        select(Module).where(Module.is_active == True).order_by(Module.order)
    )
    modules = result.scalars().all()
    return modules


@router.get("/{module_code}/permissions", response_model=list[PermissionResponse])
async def list_module_permissions(
    module_code: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_active_user)
):
    """List all permissions for a module."""
    result = await db.execute(select(Module).where(Module.code == module_code))
    module = result.scalar_one_or_none()
    
    if not module:
        return []
    
    result = await db.execute(select(Permission).where(Permission.module_id == module.id))
    permissions = result.scalars().all()
    return permissions


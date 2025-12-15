from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.models import User, Module, Permission
from app.core.config import settings
from app.core.security import get_password_hash


async def create_superadmin(db: AsyncSession) -> None:
    """Create superadmin user if not exists."""
    result = await db.execute(select(User).where(User.email == settings.SUPERADMIN_EMAIL))
    if result.scalar_one_or_none():
        return  # Superadmin already exists
    
    superadmin = User(
        email=settings.SUPERADMIN_EMAIL,
        name="Administrador",
        password_hash=get_password_hash(settings.SUPERADMIN_PASSWORD),
        is_active=True,
        is_superadmin=True,
    )
    
    db.add(superadmin)
    await db.commit()
    print(f"Superadmin criado: {settings.SUPERADMIN_EMAIL}")


async def create_default_modules(db: AsyncSession) -> None:
    """Create default system modules if not exists."""
    modules_data = [
        {
            "code": "controladoria",
            "name": "Controladoria",
            "description": "Gestão financeira e indicadores",
            "icon": "PieChart",
            "order": "1",
        },
        {
            "code": "planejamento",
            "name": "Planejamento",
            "description": "Planejamento estratégico e operacional",
            "icon": "Target",
            "order": "2",
        },
        {
            "code": "operacoes",
            "name": "Operações",
            "description": "KPIs e métricas operacionais do call center",
            "icon": "Headphones",
            "order": "3",
        },
        {
            "code": "rh",
            "name": "Recursos Humanos",
            "description": "Gestão de pessoas e colaboradores",
            "icon": "Users",
            "order": "4",
        },
        {
            "code": "juridico",
            "name": "Jurídico",
            "description": "Gestão jurídica e trabalhista",
            "icon": "Scale",
            "order": "5",
        },
    ]
    
    # Check if modules already exist
    result = await db.execute(select(Module).limit(1))
    if result.scalar_one_or_none():
        print("Módulos já existem")
        return
    
    # First, create all modules
    modules = []
    for module_data in modules_data:
        module = Module(**module_data)
        db.add(module)
        modules.append((module, module_data["name"]))
    
    # Flush to get the module IDs
    await db.flush()
    
    # Now create permissions for each module
    default_actions = ["view", "create", "edit", "delete", "export", "admin"]
    for module, module_name in modules:
        for action in default_actions:
            permission = Permission(
                module_id=module.id,
                action=action,
                resource="*",
                description=f"Permissão para {action} no módulo {module_name}",
            )
            db.add(permission)
    
    await db.commit()
    print("Módulos e permissões padrão criados")


async def init_default_data(db: AsyncSession) -> None:
    """Initialize all default data."""
    await create_superadmin(db)
    await create_default_modules(db)

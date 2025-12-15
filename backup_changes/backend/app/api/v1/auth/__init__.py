from fastapi import APIRouter
from .routes import router

auth_router = router

__all__ = ["auth_router"]


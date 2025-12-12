from fastapi import APIRouter
from .routes import router

users_router = router

__all__ = ["users_router"]


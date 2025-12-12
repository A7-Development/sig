from fastapi import APIRouter
from .routes import router

modules_router = router

__all__ = ["modules_router"]


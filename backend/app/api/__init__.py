"""Сборка роутеров под общим префиксом /api — как в @server контракта."""

from fastapi import APIRouter

from app.api import event_types

router = APIRouter(prefix="/api")
router.include_router(event_types.router)

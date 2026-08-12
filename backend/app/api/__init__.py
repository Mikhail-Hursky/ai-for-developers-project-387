"""Сборка роутеров под общим префиксом /api — как в @server контракта."""

from fastapi import APIRouter

from app.api import admin, bookings, event_types

router = APIRouter(prefix="/api")
router.include_router(event_types.router)
router.include_router(bookings.router)
router.include_router(admin.router)

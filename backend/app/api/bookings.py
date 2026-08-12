"""Ручка гостя: создание брони."""

from fastapi import APIRouter

from app import booking as booking_rules
from app.api.deps import NowDep, StorageDep
from app.schemas import (
    Booking,
    CreateBookingRequest,
    NotFoundErrorResponse,
    SlotConflictErrorResponse,
    ValidationErrorResponse,
)

router = APIRouter(prefix="/bookings", tags=["Гость: бронирование"])


@router.post(
    "",
    status_code=201,
    response_model_exclude_none=True,
    summary="Создать бронирование",
    responses={
        404: {"model": NotFoundErrorResponse},
        409: {"model": SlotConflictErrorResponse},
        422: {"model": ValidationErrorResponse},
    },
)
def create_booking(request: CreateBookingRequest, storage: StorageDep, now: NowDep) -> Booking:
    """Пустой comment из ответа выкидываем: в контракте поле необязательное, не nullable."""
    return booking_rules.create_booking(request, storage, now)

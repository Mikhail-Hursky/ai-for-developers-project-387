"""Ручки владельца календаря."""

from fastapi import APIRouter

from app.api.deps import NowDep, StorageDep
from app.errors import EventTypeConflictError
from app.schemas import (
    Booking,
    CreateEventTypeRequest,
    EventType,
    EventTypeConflictErrorResponse,
    ValidationErrorResponse,
)

router = APIRouter(prefix="/admin", tags=["Владелец: админская часть"])


@router.post(
    "/event-types",
    status_code=201,
    summary="Создать тип события",
    responses={
        409: {"model": EventTypeConflictErrorResponse},
        422: {"model": ValidationErrorResponse},
    },
)
def create_event_type(request: CreateEventTypeRequest, storage: StorageDep) -> EventType:
    """Владелец задаёт id сам, поэтому дубликат — обычный конфликт, а не ошибка сервера."""
    with storage.lock:
        if storage.has_event_type(request.id):
            raise EventTypeConflictError("Тип события с таким id уже существует.")
        storage.add_event_type(request)
    return request


@router.get(
    "/bookings/upcoming",
    response_model_exclude_none=True,
    summary="Предстоящие встречи",
)
def list_upcoming_bookings(storage: StorageDep, now: NowDep) -> list[Booking]:
    return storage.upcoming_bookings(now)

"""Ручки владельца календаря."""

from fastapi import APIRouter

from app.api.deps import NowDep, StorageDep
from app.errors import EventTypeConflictError
from app.schemas import Booking, CreateEventTypeRequest, EventType

router = APIRouter(prefix="/admin", tags=["Владелец: админская часть"])


@router.post("/event-types", status_code=201, summary="Создать тип события")
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
    """Брони всех типов событий, начинающиеся не раньше текущего момента."""
    upcoming = [booking for booking in storage.list_bookings() if booking.start_at >= now]
    return sorted(upcoming, key=lambda booking: booking.start_at)

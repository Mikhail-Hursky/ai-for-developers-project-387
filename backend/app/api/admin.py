"""Ручки владельца календаря."""

from fastapi import APIRouter

from app.api.deps import StorageDep
from app.errors import EventTypeConflictError
from app.schemas import CreateEventTypeRequest, EventType

router = APIRouter(prefix="/admin", tags=["Владелец: админская часть"])


@router.post("/event-types", status_code=201, summary="Создать тип события")
def create_event_type(request: CreateEventTypeRequest, storage: StorageDep) -> EventType:
    """Владелец задаёт id сам, поэтому дубликат — обычный конфликт, а не ошибка сервера."""
    with storage.lock:
        if storage.has_event_type(request.id):
            raise EventTypeConflictError("Тип события с таким id уже существует.")
        storage.add_event_type(request)
    return request

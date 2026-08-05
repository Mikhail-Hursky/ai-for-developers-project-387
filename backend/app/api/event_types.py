"""Ручки гостя: типы событий и свободные слоты."""

from fastapi import APIRouter

from app import slots
from app.api.deps import NowDep, StorageDep
from app.errors import EVENT_TYPE_NOT_FOUND_MESSAGE, NotFoundError
from app.schemas import Availability, EventType
from app.storage import Storage

router = APIRouter(prefix="/event-types", tags=["Гость: типы событий и слоты"])


def require_event_type(storage: Storage, event_type_id: str) -> EventType:
    """Найти тип события или ответить 404 — контракт другого варианта не даёт."""
    event_type = storage.get_event_type(event_type_id)
    if event_type is None:
        raise NotFoundError(EVENT_TYPE_NOT_FOUND_MESSAGE)
    return event_type


@router.get("", summary="Список типов событий")
def list_event_types(storage: StorageDep) -> list[EventType]:
    return storage.list_event_types()


@router.get("/{event_type_id}", summary="Тип события по идентификатору")
def get_event_type(event_type_id: str, storage: StorageDep) -> EventType:
    return require_event_type(storage, event_type_id)


@router.get("/{event_type_id}/slots", summary="Свободные слоты на 14 дней")
def list_slots(event_type_id: str, storage: StorageDep, now: NowDep) -> Availability:
    event_type = require_event_type(storage, event_type_id)
    return slots.build_availability(event_type, now, storage.busy_intervals())

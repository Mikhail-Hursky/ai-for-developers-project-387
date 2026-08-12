"""Правила создания брони — без HTTP, чтобы их можно было читать целиком."""

from datetime import datetime, timedelta
from uuid import uuid4

from app import slots
from app.errors import (
    EVENT_TYPE_NOT_FOUND_MESSAGE,
    NotFoundError,
    SlotConflictError,
    ValidationFailedError,
)
from app.schemas import Booking, CreateBookingRequest
from app.storage import Storage

OFF_GRID_MESSAGE = "Время должно совпадать с началом свободного слота внутри окна записи."
CONFLICT_MESSAGE = "Это время уже занято другой бронью. Обновите список свободных слотов."


def create_booking(request: CreateBookingRequest, storage: Storage, now: datetime) -> Booking:
    """Создать бронь, проверив условия в порядке из контракта.

    Порядок важен: неизвестный тип события — 404, время вне сетки или окна — 422,
    занятое время — 409. Занятость отделена от сетки потому, что повторный запрос
    с тем же телом исправит только гонку за слот, но не ошибку во времени.
    """
    event_type = storage.get_event_type(request.event_type_id)
    if event_type is None:
        raise NotFoundError(EVENT_TYPE_NOT_FOUND_MESSAGE)

    if not slots.is_bookable_start(event_type, request.start_at, now):
        raise ValidationFailedError("startAt", OFF_GRID_MESSAGE)

    end_at = request.start_at + timedelta(minutes=event_type.duration_minutes)

    # Проверка занятости и запись — под локом: иначе два одновременных запроса
    # на один слот оба прошли бы проверку и правило занятости нарушилось бы.
    with storage.lock:
        if slots.overlaps_any(request.start_at, end_at, storage.busy_intervals()):
            raise SlotConflictError(CONFLICT_MESSAGE)

        booking = Booking(
            id=uuid4(),
            event_type=event_type,
            start_at=request.start_at,
            end_at=end_at,
            guest_name=request.guest_name,
            guest_email=request.guest_email,
            comment=request.comment,
            created_at=now,
        )
        storage.add_booking(booking)

    return booking

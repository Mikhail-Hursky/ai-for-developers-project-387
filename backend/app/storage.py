"""Хранилище в памяти: типы событий и брони. Сбрасывается вместе с процессом."""

import threading
from datetime import datetime
from uuid import UUID

from app.schemas import Booking, EventType


class Storage:
    """Два словаря и лок. Лок нужен там, где проверка и запись должны быть неделимы."""

    def __init__(self) -> None:
        self._event_types: dict[str, EventType] = {}
        self._bookings: dict[UUID, Booking] = {}
        self.lock = threading.Lock()

    def list_event_types(self) -> list[EventType]:
        """Типы событий в порядке создания."""
        return list(self._event_types.values())

    def get_event_type(self, event_type_id: str) -> EventType | None:
        return self._event_types.get(event_type_id)

    def has_event_type(self, event_type_id: str) -> bool:
        return event_type_id in self._event_types

    def add_event_type(self, event_type: EventType) -> None:
        self._event_types[event_type.id] = event_type

    def list_bookings(self) -> list[Booking]:
        return list(self._bookings.values())

    def upcoming_bookings(self, now: datetime) -> list[Booking]:
        """Брони всех типов событий, начинающиеся не раньше `now`, по возрастанию начала."""
        upcoming = [booking for booking in self.list_bookings() if booking.start_at >= now]
        return sorted(upcoming, key=lambda booking: booking.start_at)

    def add_booking(self, booking: Booking) -> None:
        self._bookings[booking.id] = booking

    def busy_intervals(self) -> list[tuple[datetime, datetime]]:
        """Интервалы всех броней: правило занятости не различает типы событий.

        `list(...)` снимает атомарный снапшот view до итерации: без него чтение
        может пересечься с записью под локом в другом потоке threadpool'а и
        поймать `RuntimeError: dictionary changed size during iteration`. Взять
        здесь тот же лок, что в booking.py, нельзя — он нереентрантный, а
        booking.py вызывает этот метод, уже держа его: получился бы дедлок.
        """
        return [(b.start_at, b.end_at) for b in list(self._bookings.values())]


_storage = Storage()


def get_storage() -> Storage:
    """Зависимость FastAPI: тесты подменяют её на чистое хранилище."""
    return _storage

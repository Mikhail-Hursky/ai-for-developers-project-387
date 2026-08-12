"""Хранилище: гонка между чтением занятости и записью новой брони."""

import sys
import threading
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from app.schemas import Booking, EventType
from app.storage import Storage

EVENT_TYPE = EventType(id="intro-call", name="Знакомство", description="", duration_minutes=30)

# Много броней заранее — чтобы итерация busy_intervals() занимала заметное
# число байткод-шагов и переключение GIL успевало попасть на середину обхода.
PRELOADED_BOOKINGS = 500
WRITES_DURING_READ = 1500


def _booking(offset_minutes: int) -> Booking:
    start = datetime(2026, 8, 5, 10, 0, tzinfo=UTC) + timedelta(minutes=offset_minutes)
    return Booking(
        id=uuid4(),
        event_type=EVENT_TYPE,
        start_at=start,
        end_at=start + timedelta(minutes=30),
        guest_name="Гость",
        guest_email="guest@example.com",
        created_at=start,
    )


def test_busy_intervals_survives_concurrent_add_booking():
    """`GET /slots` читает busy_intervals() без лока, пока `POST /bookings`
    пишет под локом в другом потоке threadpool'а. Итерация dict.values() без
    снапшота ловит `RuntimeError: dictionary changed size during iteration`
    ровно в этой гонке. Лочить busy_intervals() нельзя — booking.py вызывает
    её, уже держа тот же (нереентрантный) лок, так что это был бы дедлок.
    """
    storage = Storage()
    for i in range(PRELOADED_BOOKINGS):
        storage.add_booking(_booking(i))

    errors: list[BaseException] = []
    stop = threading.Event()

    def read_loop() -> None:
        while not stop.is_set():
            try:
                storage.busy_intervals()
            except RuntimeError as exc:  # содержательная гонка — не более
                errors.append(exc)
                return

    def write_loop() -> None:
        for i in range(WRITES_DURING_READ):
            storage.add_booking(_booking(PRELOADED_BOOKINGS + i))

    # Частые переключения GIL резко повышают шанс поймать гонку за разумное
    # число итераций и не раздувают тест по времени.
    original_interval = sys.getswitchinterval()
    sys.setswitchinterval(1e-6)
    try:
        reader = threading.Thread(target=read_loop)
        writer = threading.Thread(target=write_loop)
        reader.start()
        writer.start()
        writer.join()
        stop.set()
        reader.join()
    finally:
        sys.setswitchinterval(original_interval)

    assert errors == []

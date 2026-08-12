"""Сетка свободных слотов: чистые функции без хранилища и FastAPI."""

from collections.abc import Sequence
from datetime import UTC, date, datetime, timedelta

from app import config
from app.schemas import Availability, DayAvailability, EventType, Slot


def window_dates(today: date) -> list[date]:
    """Все даты окна записи по порядку, начиная с today."""
    return [today + timedelta(days=offset) for offset in range(config.WINDOW_DAYS)]


def day_grid(day: date, duration_minutes: int) -> list[Slot]:
    """Сетка слотов рабочего дня.

    Первый слот начинается в WORK_DAY_START, шаг равен длительности типа события,
    слот попадает в сетку, пока успевает закончиться до WORK_DAY_END. В выходные
    сетка пустая — сам день из окна записи при этом не выпадает.
    """
    if day.weekday() not in config.WORKDAYS:
        return []

    duration = timedelta(minutes=duration_minutes)
    day_end = datetime.combine(day, config.WORK_DAY_END, tzinfo=UTC)
    start = datetime.combine(day, config.WORK_DAY_START, tzinfo=UTC)

    grid: list[Slot] = []
    while start + duration <= day_end:
        grid.append(Slot(start_at=start, end_at=start + duration))
        start += duration
    return grid


def overlaps_any(
    start_at: datetime,
    end_at: datetime,
    busy: Sequence[tuple[datetime, datetime]],
) -> bool:
    """Пересекается ли интервал хотя бы с одним занятым интервалом.

    Стык интервалов пересечением не считается: встреча, которая заканчивается
    в 11:00, не мешает встрече, которая в 11:00 начинается.
    """
    return any(start_at < busy_end and busy_start < end_at for busy_start, busy_end in busy)


def _earliest_start(now: datetime) -> datetime:
    """Раньше этого момента записаться нельзя — встреча вот-вот началась бы."""
    return now + timedelta(minutes=config.LEAD_TIME_MINUTES)


def day_availability(
    day: date,
    duration_minutes: int,
    now: datetime,
    busy: Sequence[tuple[datetime, datetime]],
) -> DayAvailability:
    """Свободные слоты дня: сетка минус прошедшие и минус пересечённые бронями."""
    earliest_start = _earliest_start(now)
    slots = [
        slot
        for slot in day_grid(day, duration_minutes)
        if slot.start_at >= earliest_start and not overlaps_any(slot.start_at, slot.end_at, busy)
    ]
    return DayAvailability(date=day, slots=slots)


def build_availability(
    event_type: EventType,
    now: datetime,
    busy: Sequence[tuple[datetime, datetime]],
) -> Availability:
    """Окно записи типа события: все 14 дней, включая дни без свободных слотов."""
    days = window_dates(now.astimezone(UTC).date())
    return Availability(
        event_type_id=event_type.id,
        slot_duration_minutes=event_type.duration_minutes,
        window_start_date=days[0],
        window_end_date=days[-1],
        days=[day_availability(day, event_type.duration_minutes, now, busy) for day in days],
    )


def is_bookable_start(event_type: EventType, start_at: datetime, now: datetime) -> bool:
    """Годится ли start_at как начало брони: сетка, окно записи и lead time.

    Занятость здесь не проверяется — это отдельное правило с другим кодом ответа.
    Функция намеренно переиспользует day_grid, иначе выдача слотов и их приём
    со временем разъехались бы.
    """
    day = start_at.astimezone(UTC).date()
    if day not in window_dates(now.astimezone(UTC).date()):
        return False
    if start_at < _earliest_start(now):
        return False
    return any(slot.start_at == start_at for slot in day_grid(day, event_type.duration_minutes))

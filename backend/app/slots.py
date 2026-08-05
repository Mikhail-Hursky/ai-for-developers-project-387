"""Сетка свободных слотов: чистые функции без хранилища и FastAPI."""

from datetime import UTC, date, datetime, timedelta

from app import config
from app.schemas import Slot


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

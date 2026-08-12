"""Сетка слотов и окно записи — чистые функции, без HTTP и хранилища."""

from datetime import UTC, date, datetime

from app.schemas import EventType
from app.slots import (
    build_availability,
    day_availability,
    day_grid,
    is_bookable_start,
    overlaps_any,
    window_dates,
)

WEDNESDAY = date(2026, 8, 5)
SATURDAY = date(2026, 8, 8)
SUNDAY = date(2026, 8, 9)

# Среда 09:00 UTC — рабочий день до начала рабочих часов, поэтому lead time
# не отсекает ни один слот первого дня окна.
NOW = datetime(2026, 8, 5, 9, 0, tzinfo=UTC)

INTRO_CALL = EventType(
    id="intro-call",
    name="Знакомство",
    description="Короткий созвон.",
    duration_minutes=30,
)
DESIGN_REVIEW = EventType(
    id="design-review",
    name="Ревью дизайна",
    description="Разбираем макеты.",
    duration_minutes=60,
)


def test_window_covers_fourteen_days_starting_today():
    dates = window_dates(WEDNESDAY)

    assert len(dates) == 14
    assert dates[0] == date(2026, 8, 5)
    assert dates[-1] == date(2026, 8, 18)


def test_grid_of_thirty_minute_type_fills_the_working_day():
    grid = day_grid(WEDNESDAY, duration_minutes=30)

    assert len(grid) == 16
    assert grid[0].start_at == datetime(2026, 8, 5, 10, 0, tzinfo=UTC)
    assert grid[0].end_at == datetime(2026, 8, 5, 10, 30, tzinfo=UTC)
    assert grid[-1].start_at == datetime(2026, 8, 5, 17, 30, tzinfo=UTC)
    assert grid[-1].end_at == datetime(2026, 8, 5, 18, 0, tzinfo=UTC)


def test_grid_step_equals_event_type_duration():
    grid = day_grid(WEDNESDAY, duration_minutes=60)

    assert len(grid) == 8
    assert [slot.start_at.hour for slot in grid] == [10, 11, 12, 13, 14, 15, 16, 17]


def test_last_slot_never_ends_after_the_working_day():
    grid = day_grid(WEDNESDAY, duration_minutes=90)

    assert len(grid) == 5
    assert grid[-1].start_at == datetime(2026, 8, 5, 16, 0, tzinfo=UTC)
    assert grid[-1].end_at == datetime(2026, 8, 5, 17, 30, tzinfo=UTC)


def test_weekend_grid_is_empty():
    assert day_grid(SATURDAY, duration_minutes=30) == []
    assert day_grid(SUNDAY, duration_minutes=30) == []


def test_full_day_duration_gives_no_slots_on_a_workday():
    # Контракт разрешает durationMinutes до 1440 (сутки), но рабочий день
    # фиксирован в 8 часов (10:00-18:00) — такая длительность не влезает ни в
    # один слот. Это осознанное расхождение контракта с дизайном рабочего дня,
    # тест фиксирует его как намеренное, а не как случайный пробел.
    assert day_grid(WEDNESDAY, duration_minutes=1440) == []


def test_overlapping_intervals_are_detected():
    busy = [(datetime(2026, 8, 5, 10, 0, tzinfo=UTC), datetime(2026, 8, 5, 11, 0, tzinfo=UTC))]

    inside = (datetime(2026, 8, 5, 10, 30, tzinfo=UTC), datetime(2026, 8, 5, 10, 45, tzinfo=UTC))
    assert overlaps_any(*inside, busy) is True

    # Стык интервалов пересечением не считается: 11:00 свободно.
    adjacent = (datetime(2026, 8, 5, 11, 0, tzinfo=UTC), datetime(2026, 8, 5, 11, 30, tzinfo=UTC))
    assert overlaps_any(*adjacent, busy) is False


def test_slots_starting_within_lead_time_are_hidden():
    # 09:58 → слоты, начинающиеся раньше 10:03, недоступны, а 10:00 как раз такой.
    now = datetime(2026, 8, 5, 9, 58, tzinfo=UTC)

    day = day_availability(WEDNESDAY, duration_minutes=30, now=now, busy=[])

    assert day.slots[0].start_at == datetime(2026, 8, 5, 10, 30, tzinfo=UTC)


def test_slot_starting_exactly_at_the_lead_time_boundary_is_bookable():
    # Граница — код использует `>=`/`не <`, а не строгое неравенство: слот,
    # начинающийся ровно через LEAD_TIME_MINUTES, должен остаться доступным.
    now = datetime(2026, 8, 5, 9, 55, tzinfo=UTC)
    boundary_start = datetime(2026, 8, 5, 10, 0, tzinfo=UTC)

    assert is_bookable_start(INTRO_CALL, boundary_start, now) is True

    day = day_availability(WEDNESDAY, duration_minutes=30, now=now, busy=[])
    assert day.slots[0].start_at == boundary_start


def test_slot_of_another_event_type_blocks_the_overlapping_slot():
    # Часовая бронь 10:00–11:00 закрывает получасовые слоты 10:00 и 10:30.
    busy = [(datetime(2026, 8, 5, 10, 0, tzinfo=UTC), datetime(2026, 8, 5, 11, 0, tzinfo=UTC))]

    day = day_availability(WEDNESDAY, duration_minutes=30, now=NOW, busy=busy)

    starts = [slot.start_at for slot in day.slots]
    assert datetime(2026, 8, 5, 10, 0, tzinfo=UTC) not in starts
    assert datetime(2026, 8, 5, 10, 30, tzinfo=UTC) not in starts
    assert datetime(2026, 8, 5, 11, 0, tzinfo=UTC) in starts
    assert len(day.slots) == 14


def test_availability_describes_the_whole_window():
    availability = build_availability(INTRO_CALL, now=NOW, busy=[])

    assert availability.event_type_id == "intro-call"
    assert availability.slot_duration_minutes == 30
    assert availability.window_start_date == date(2026, 8, 5)
    assert availability.window_end_date == date(2026, 8, 18)
    assert len(availability.days) == 14
    assert [day.date for day in availability.days] == window_dates(WEDNESDAY)


def test_availability_keeps_weekend_days_with_empty_slots():
    availability = build_availability(INTRO_CALL, now=NOW, busy=[])

    weekend = [day for day in availability.days if day.date.weekday() >= 5]
    assert [day.date for day in weekend] == [
        date(2026, 8, 8),
        date(2026, 8, 9),
        date(2026, 8, 15),
        date(2026, 8, 16),
    ]
    assert all(day.slots == [] for day in weekend)


def test_grid_start_inside_the_window_is_bookable():
    assert is_bookable_start(INTRO_CALL, datetime(2026, 8, 5, 10, 0, tzinfo=UTC), NOW) is True
    assert is_bookable_start(DESIGN_REVIEW, datetime(2026, 8, 5, 17, 0, tzinfo=UTC), NOW) is True


def test_start_outside_the_grid_is_not_bookable():
    # Не на сетке 30 минут.
    assert is_bookable_start(INTRO_CALL, datetime(2026, 8, 5, 10, 10, tzinfo=UTC), NOW) is False
    # Раньше начала рабочего дня.
    assert is_bookable_start(INTRO_CALL, datetime(2026, 8, 5, 9, 30, tzinfo=UTC), NOW) is False
    # Слот закончился бы после конца рабочего дня.
    assert is_bookable_start(DESIGN_REVIEW, datetime(2026, 8, 5, 17, 30, tzinfo=UTC), NOW) is False
    # Выходной.
    assert is_bookable_start(INTRO_CALL, datetime(2026, 8, 8, 10, 0, tzinfo=UTC), NOW) is False


def test_start_in_the_past_is_not_bookable():
    assert is_bookable_start(INTRO_CALL, datetime(2026, 8, 4, 10, 0, tzinfo=UTC), NOW) is False


def test_start_after_the_window_is_not_bookable():
    # 19 августа — первый день за окном 05.08–18.08.
    assert is_bookable_start(INTRO_CALL, datetime(2026, 8, 19, 10, 0, tzinfo=UTC), NOW) is False


def test_start_within_lead_time_is_not_bookable():
    now = datetime(2026, 8, 5, 9, 58, tzinfo=UTC)

    assert is_bookable_start(INTRO_CALL, datetime(2026, 8, 5, 10, 0, tzinfo=UTC), now) is False
    assert is_bookable_start(INTRO_CALL, datetime(2026, 8, 5, 10, 30, tzinfo=UTC), now) is True

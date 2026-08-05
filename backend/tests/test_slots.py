"""Сетка слотов и окно записи — чистые функции, без HTTP и хранилища."""

from datetime import UTC, date, datetime

from app.slots import day_grid, window_dates

WEDNESDAY = date(2026, 8, 5)
SATURDAY = date(2026, 8, 8)
SUNDAY = date(2026, 8, 9)


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

"""Единая точка получения текущего момента — чтобы тесты могли его заморозить."""

from datetime import UTC, datetime


def utc_now() -> datetime:
    """Текущий момент в UTC.

    Подключается как зависимость FastAPI, поэтому тесты подменяют её через
    `app.dependency_overrides` и получают фиксированное время.
    """
    return datetime.now(UTC)

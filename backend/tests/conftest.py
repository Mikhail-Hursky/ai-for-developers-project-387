"""Общие фикстуры: чистое хранилище и замороженное время для каждого теста."""

from collections.abc import Iterator
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.clock import utc_now
from app.main import create_app
from app.storage import Storage, get_storage

FROZEN_NOW = datetime(2026, 8, 5, 9, 0, tzinfo=UTC)
"""Среда, 5 августа 2026, 09:00 UTC — до начала рабочего дня, окно 05.08–18.08."""

INTRO_CALL = {
    "id": "intro-call",
    "name": "Знакомство",
    "description": "Короткий созвон.",
    "durationMinutes": 30,
}

DESIGN_REVIEW = {
    "id": "design-review",
    "name": "Ревью дизайна",
    "description": "Разбираем макеты.",
    "durationMinutes": 60,
}


@pytest.fixture
def storage() -> Storage:
    return Storage()


@pytest.fixture
def now() -> datetime:
    return FROZEN_NOW


@pytest.fixture
def client(storage: Storage, now: datetime) -> Iterator[TestClient]:
    """Клиент приложения с подменёнными хранилищем и часами."""
    app = create_app()
    app.dependency_overrides[get_storage] = lambda: storage
    app.dependency_overrides[utc_now] = lambda: now
    with TestClient(app) as test_client:
        yield test_client

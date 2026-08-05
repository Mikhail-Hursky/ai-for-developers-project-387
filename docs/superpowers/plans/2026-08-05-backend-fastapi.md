# Бэкенд на FastAPI — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать бэкенд календаря бронирования по контракту `spec/main.tsp` — шесть ручек, правило занятости и окно записи на 14 дней — с хранилищем в памяти.

**Architecture:** Три слоя. Роутеры в `app/api/` разбирают запрос и отдают ответ; чистые функции сетки слотов (`app/slots.py`) и правила создания брони (`app/booking.py`) ничего не знают про FastAPI и тестируются без HTTP; `app/storage.py` держит два словаря и лок. Текущий момент приходит из зависимости `app/clock.py`, поэтому тесты его замораживают.

**Tech Stack:** Python 3.13, `uv`, FastAPI, pydantic v2 (`pydantic[email]`), uvicorn, pytest, httpx, ruff.

Дизайн: [2026-08-05-backend-fastapi-design.md](../specs/2026-08-05-backend-fastapi-design.md).
Контракт: [spec/main.tsp](../../../spec/main.tsp).

## Global Constraints

- Весь код бэкенда живёт в `backend/`. Файлы `frontend/` и `spec/` в этой задаче не меняются.
- Все команды запускаются из каталога `backend/`.
- Python `>=3.13`. Зависимости ставятся через `uv`, тесты запускаются как `uv run pytest`.
- Приложение слушает порт `3000`, все ручки — под префиксом `/api`, как в `@server` контракта: `http://localhost:3000/api`.
- На проводе поля называются в `camelCase`, в Python — в `snake_case`. Перевод делает один alias-генератор в базовой модели.
- Время на проводе — строго `2026-08-05T10:00:00Z`: суффикс `Z`, точность до секунд.
- Расписание владельца: будни (пн–пт), 10:00–18:00 UTC, шаг сетки равен `durationMinutes` типа события, lead time 5 минут, окно записи 14 дней.
- Правило занятости не различает типы событий: пересечение интервалов любых двух броней запрещено.
- Комментарии и docstring — по-русски, как в остальном репозитории. Строки не длиннее 100 символов.
- Хранилище стартует пустым: ни типов событий, ни броней.

---

### Task 1: Каркас проекта и приложение с CORS

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/.gitignore`
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/app/clock.py`
- Create: `backend/app/main.py`
- Create: `backend/tests/__init__.py`
- Test: `backend/tests/test_app.py`

**Interfaces:**
- Consumes: ничего.
- Produces: модуль `app.config` с константами `WINDOW_DAYS: int`, `WORK_DAY_START: datetime.time`, `WORK_DAY_END: datetime.time`, `WORKDAYS: frozenset[int]`, `LEAD_TIME_MINUTES: int`, `CORS_ORIGINS: tuple[str, ...]`; функция `app.clock.utc_now() -> datetime`; функция `app.main.create_app() -> FastAPI` и модульный объект `app.main.app`.

- [ ] **Step 1: Создать `backend/pyproject.toml`**

```toml
[project]
name = "booking-calendar-backend"
version = "0.1.0"
description = "Бэкенд календаря бронирования по контракту spec/main.tsp"
requires-python = ">=3.13"
dependencies = [
    "fastapi>=0.115",
    "pydantic[email]>=2.9",
    "uvicorn[standard]>=0.32",
]

[dependency-groups]
dev = [
    "httpx>=0.27",
    "pytest>=8.3",
    "ruff>=0.7",
]

# Пакет не собирается и не устанавливается: это приложение, а не библиотека.
[tool.uv]
package = false

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]

[tool.ruff]
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B"]
```

- [ ] **Step 2: Создать `backend/.gitignore`**

```gitignore
.venv/
__pycache__/
.pytest_cache/
.ruff_cache/
```

- [ ] **Step 3: Создать `backend/app/__init__.py` — пустой файл**

```python
```

- [ ] **Step 4: Создать `backend/app/config.py`**

```python
"""Настройки сервиса: расписание владельца, окно записи, CORS."""

from datetime import time

WINDOW_DAYS = 14
"""Длина окна записи в днях, считая текущую дату."""

WORK_DAY_START = time(10, 0)
"""Начало рабочего дня владельца (UTC)."""

WORK_DAY_END = time(18, 0)
"""Конец рабочего дня владельца (UTC): слот должен успеть закончиться не позже."""

WORKDAYS = frozenset({0, 1, 2, 3, 4})
"""Рабочие дни недели в терминах date.weekday(): понедельник — пятница."""

LEAD_TIME_MINUTES = 5
"""Слот доступен, только если начнётся не раньше чем через это время."""

CORS_ORIGINS = ("http://localhost:5173", "http://localhost:4173")
"""Адреса Vite: dev-сервер и preview."""
```

- [ ] **Step 5: Создать `backend/app/clock.py`**

```python
"""Единая точка получения текущего момента — чтобы тесты могли его заморозить."""

from datetime import UTC, datetime


def utc_now() -> datetime:
    """Текущий момент в UTC.

    Подключается как зависимость FastAPI, поэтому тесты подменяют её через
    `app.dependency_overrides` и получают фиксированное время.
    """
    return datetime.now(UTC)
```

- [ ] **Step 6: Создать `backend/tests/__init__.py` — пустой файл**

Пакет нужен, чтобы pytest импортировал тесты как `tests.test_app`, а не как
`test_app`. Без него `from tests.conftest import ...` в следующих задачах
подтянуло бы вторую копию модуля `conftest`.

```python
```

- [ ] **Step 7: Написать падающий тест `backend/tests/test_app.py`**

```python
"""Проверки сборки приложения: CORS для dev-адресов фронтенда."""

from fastapi.testclient import TestClient

from app.main import create_app

PREFLIGHT_HEADERS = {"Access-Control-Request-Method": "GET"}


def test_preflight_allows_vite_dev_origin():
    client = TestClient(create_app())

    response = client.options(
        "/api/event-types",
        headers={"Origin": "http://localhost:5173", **PREFLIGHT_HEADERS},
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_preflight_does_not_allow_foreign_origin():
    client = TestClient(create_app())

    response = client.options(
        "/api/event-types",
        headers={"Origin": "http://evil.example.com", **PREFLIGHT_HEADERS},
    )

    assert "access-control-allow-origin" not in response.headers
```

- [ ] **Step 8: Запустить тест и убедиться, что он падает**

Run: `cd backend && uv run pytest tests/test_app.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.main'`

- [ ] **Step 9: Создать `backend/app/main.py`**

```python
"""Сборка приложения FastAPI."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import config


def create_app() -> FastAPI:
    """Собрать приложение. Отдельная функция — чтобы тесты брали чистый экземпляр."""
    app = FastAPI(
        title="Booking Calendar API",
        description="HTTP API календаря бронирования. Хранилище в памяти.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(config.CORS_ORIGINS),
        allow_methods=["GET", "POST"],
        allow_headers=["Accept", "Content-Type"],
    )
    return app


app = create_app()
```

- [ ] **Step 10: Запустить тест и убедиться, что он проходит**

Run: `cd backend && uv run pytest tests/test_app.py -v`
Expected: PASS, 2 passed

- [ ] **Step 11: Закоммитить**

```bash
git add backend/pyproject.toml backend/uv.lock backend/.gitignore backend/app backend/tests
git commit -m "feat(backend): scaffold FastAPI app with CORS for the Vite dev origin"
```

---

### Task 2: Модели контракта

**Files:**
- Create: `backend/app/schemas.py`
- Test: `backend/tests/test_schemas.py`

**Interfaces:**
- Consumes: ничего из предыдущих задач.
- Produces: из `app.schemas` — `EventTypeId` (Annotated-строка), `UtcDateTime` (Annotated-datetime), классы `EventType`, `Slot`, `DayAvailability`, `Availability`, `GuestInfo`, `CreateBookingRequest`, `Booking` и алиас `CreateEventTypeRequest = EventType`. Поля: `EventType(id, name, description, duration_minutes)`, `Slot(start_at, end_at)`, `DayAvailability(date, slots)`, `Availability(event_type_id, slot_duration_minutes, window_start_date, window_end_date, days)`, `GuestInfo(guest_name, guest_email, comment)`, `CreateBookingRequest(guest_name, guest_email, comment, event_type_id, start_at)`, `Booking(guest_name, guest_email, comment, id, event_type, start_at, end_at, created_at)`. Все модели принимают и camelCase-алиасы, и имена полей.

- [ ] **Step 1: Написать падающий тест `backend/tests/test_schemas.py`**

```python
"""Модели контракта: имена полей на проводе, формат времени, ограничения."""

from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.schemas import Booking, CreateBookingRequest, EventType, Slot

INTRO_CALL = EventType(
    id="intro-call",
    name="Знакомство",
    description="Короткий созвон.",
    duration_minutes=30,
)


def test_event_type_uses_camel_case_on_the_wire():
    assert INTRO_CALL.model_dump(mode="json", by_alias=True) == {
        "id": "intro-call",
        "name": "Знакомство",
        "description": "Короткий созвон.",
        "durationMinutes": 30,
    }


def test_slot_formats_time_with_z_suffix_and_second_precision():
    slot = Slot(
        start_at=datetime(2026, 8, 5, 10, 0, tzinfo=UTC),
        end_at=datetime(2026, 8, 5, 10, 30, 0, 123456, tzinfo=UTC),
    )

    assert slot.model_dump(mode="json", by_alias=True) == {
        "startAt": "2026-08-05T10:00:00Z",
        "endAt": "2026-08-05T10:30:00Z",
    }


def test_booking_request_accepts_camel_case_aliases():
    request = CreateBookingRequest(
        eventTypeId="intro-call",
        startAt="2026-08-05T10:00:00Z",
        guestName="Анна Петрова",
        guestEmail="anna@example.com",
    )

    assert request.event_type_id == "intro-call"
    assert request.start_at == datetime(2026, 8, 5, 10, 0, tzinfo=UTC)
    assert request.comment is None


def test_offset_time_is_converted_to_utc():
    request = CreateBookingRequest(
        eventTypeId="intro-call",
        startAt="2026-08-05T13:00:00+03:00",
        guestName="Анна Петрова",
        guestEmail="anna@example.com",
    )

    assert request.start_at == datetime(2026, 8, 5, 10, 0, tzinfo=UTC)


def test_time_without_timezone_is_rejected():
    with pytest.raises(ValidationError):
        CreateBookingRequest(
            eventTypeId="intro-call",
            startAt="2026-08-05T10:00:00",
            guestName="Анна Петрова",
            guestEmail="anna@example.com",
        )


@pytest.mark.parametrize("event_type_id", ["Intro-Call", "intro_call", "-intro", "intro--call", ""])
def test_malformed_event_type_id_is_rejected(event_type_id: str):
    with pytest.raises(ValidationError):
        EventType(id=event_type_id, name="Знакомство", description="", duration_minutes=30)


@pytest.mark.parametrize("duration_minutes", [0, 1441])
def test_duration_outside_contract_bounds_is_rejected(duration_minutes: int):
    with pytest.raises(ValidationError):
        EventType(
            id="intro-call",
            name="Знакомство",
            description="",
            duration_minutes=duration_minutes,
        )


def test_malformed_guest_email_is_rejected():
    with pytest.raises(ValidationError):
        CreateBookingRequest(
            eventTypeId="intro-call",
            startAt="2026-08-05T10:00:00Z",
            guestName="Анна Петрова",
            guestEmail="not-an-email",
        )


def test_booking_serializes_nested_event_type():
    booking = Booking(
        id="4f3a1c6e-59f1-4a0a-9d1f-4f6b0d2c1a01",
        event_type=INTRO_CALL,
        start_at=datetime(2026, 8, 5, 10, 0, tzinfo=UTC),
        end_at=datetime(2026, 8, 5, 10, 30, tzinfo=UTC),
        guest_name="Анна Петрова",
        guest_email="anna@example.com",
        comment="Обсудим лендинг.",
        created_at=datetime(2026, 8, 5, 9, 0, tzinfo=UTC),
    )

    payload = booking.model_dump(mode="json", by_alias=True)

    assert payload["id"] == "4f3a1c6e-59f1-4a0a-9d1f-4f6b0d2c1a01"
    assert payload["eventType"]["durationMinutes"] == 30
    assert payload["startAt"] == "2026-08-05T10:00:00Z"
    assert payload["createdAt"] == "2026-08-05T09:00:00Z"
    assert payload["guestName"] == "Анна Петрова"
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `cd backend && uv run pytest tests/test_schemas.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.schemas'`

- [ ] **Step 3: Создать `backend/app/schemas.py`**

```python
"""Модели контракта из spec/main.tsp.

В Python поля называются в snake_case, на проводе — в camelCase: перевод делает
alias-генератор базовой модели. Время сериализуется как `2026-08-05T10:00:00Z`,
как в Prism-моке, поэтому у него собственный сериализатор.
"""

from datetime import UTC, date, datetime
from typing import Annotated
from uuid import UUID

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, PlainSerializer
from pydantic.alias_generators import to_camel

EVENT_TYPE_ID_PATTERN = r"^[a-z0-9]+(-[a-z0-9]+)*$"
"""Латиница в нижнем регистре, цифры и дефисы — как в контракте."""


def _require_utc(value: datetime) -> datetime:
    """Привести время к UTC. Время без таймзоны — ошибка: контракт требует UTC."""
    if value.tzinfo is None:
        raise ValueError("Укажите время в UTC с суффиксом Z, например 2026-08-05T10:00:00Z")
    return value.astimezone(UTC)


def _format_utc(value: datetime) -> str:
    """Формат контракта: UTC с суффиксом Z и точностью до секунд."""
    return value.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


UtcDateTime = Annotated[
    datetime,
    AfterValidator(_require_utc),
    PlainSerializer(_format_utc, return_type=str),
]

EventTypeId = Annotated[
    str,
    Field(min_length=1, max_length=100, pattern=EVENT_TYPE_ID_PATTERN),
]


class ApiModel(BaseModel):
    """Базовая модель: camelCase на проводе, имена полей принимаются тоже."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class EventType(ApiModel):
    """Тип события, который создаёт владелец календаря."""

    id: EventTypeId
    name: Annotated[str, Field(min_length=1, max_length=150)]
    description: Annotated[str, Field(max_length=2000)]
    duration_minutes: Annotated[int, Field(ge=1, le=1440)]


CreateEventTypeRequest = EventType
"""Тело создания типа события совпадает с самим типом: владелец задаёт все поля."""


class Slot(ApiModel):
    """Слот для записи."""

    start_at: UtcDateTime
    end_at: UtcDateTime


class DayAvailability(ApiModel):
    """Свободные слоты одного дня; пустой список — свободных слотов нет."""

    date: date
    slots: list[Slot]


class Availability(ApiModel):
    """Свободные слоты типа события в окне записи."""

    event_type_id: EventTypeId
    slot_duration_minutes: Annotated[int, Field(ge=1, le=1440)]
    window_start_date: date
    window_end_date: date
    days: list[DayAvailability]


class GuestInfo(ApiModel):
    """Данные гостя, указанные при бронировании."""

    guest_name: Annotated[str, Field(min_length=1, max_length=200)]
    guest_email: Annotated[EmailStr, Field(max_length=320)]
    comment: Annotated[str | None, Field(max_length=1000)] = None


class CreateBookingRequest(GuestInfo):
    """Тело запроса на создание брони."""

    event_type_id: EventTypeId
    start_at: UtcDateTime


class Booking(GuestInfo):
    """Созданное бронирование."""

    id: UUID
    event_type: EventType
    start_at: UtcDateTime
    end_at: UtcDateTime
    created_at: UtcDateTime
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `cd backend && uv run pytest tests/test_schemas.py -v`
Expected: PASS, 14 passed (пять из них — параметризованные варианты `id`, два — границы длительности)

- [ ] **Step 5: Закоммитить**

```bash
git add backend/app/schemas.py backend/tests/test_schemas.py
git commit -m "feat(backend): add contract models with camelCase aliases and UTC formatting"
```

---

### Task 3: Сетка слотов и окно записи

**Files:**
- Create: `backend/app/slots.py`
- Test: `backend/tests/test_slots.py`

**Interfaces:**
- Consumes: `app.config` (Task 1), `app.schemas.Slot` (Task 2).
- Produces: `app.slots.window_dates(today: date) -> list[date]` и `app.slots.day_grid(day: date, duration_minutes: int) -> list[Slot]`.

- [ ] **Step 1: Написать падающий тест `backend/tests/test_slots.py`**

```python
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
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `cd backend && uv run pytest tests/test_slots.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.slots'`

- [ ] **Step 3: Создать `backend/app/slots.py`**

```python
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
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `cd backend && uv run pytest tests/test_slots.py -v`
Expected: PASS, 5 passed

- [ ] **Step 5: Закоммитить**

```bash
git add backend/app/slots.py backend/tests/test_slots.py
git commit -m "feat(backend): generate the slot grid and the 14-day booking window"
```

---

### Task 4: Доступность слотов — lead time и вычитание броней

**Files:**
- Modify: `backend/app/slots.py` (дописать функции после `day_grid`)
- Test: `backend/tests/test_slots.py` (дописать тесты)

**Interfaces:**
- Consumes: `app.slots.window_dates`, `app.slots.day_grid` (Task 3), `app.schemas.EventType`, `Availability`, `DayAvailability` (Task 2).
- Produces:
  - `app.slots.overlaps_any(start_at: datetime, end_at: datetime, busy: Sequence[tuple[datetime, datetime]]) -> bool`
  - `app.slots.day_availability(day: date, duration_minutes: int, now: datetime, busy: Sequence[tuple[datetime, datetime]]) -> DayAvailability`
  - `app.slots.build_availability(event_type: EventType, now: datetime, busy: Sequence[tuple[datetime, datetime]]) -> Availability`
  - `app.slots.is_bookable_start(event_type: EventType, start_at: datetime, now: datetime) -> bool`

- [ ] **Step 1: Дописать падающие тесты в `backend/tests/test_slots.py`**

Добавить в начало файла импорты:

```python
from app.schemas import EventType
from app.slots import (
    build_availability,
    day_availability,
    day_grid,
    is_bookable_start,
    overlaps_any,
    window_dates,
)
```

(строка `from app.slots import day_grid, window_dates` при этом удаляется)

Добавить константы после `SUNDAY`:

```python
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
```

Добавить тесты в конец файла:

```python
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
```

- [ ] **Step 2: Запустить тесты и убедиться, что новые падают**

Run: `cd backend && uv run pytest tests/test_slots.py -v`
Expected: FAIL — `ImportError: cannot import name 'overlaps_any' from 'app.slots'`

- [ ] **Step 3: Дописать `backend/app/slots.py`**

Добавить в блок импортов:

```python
from collections.abc import Sequence

from app.schemas import Availability, DayAvailability, EventType, Slot
```

(строка `from app.schemas import Slot` при этом удаляется)

Дописать в конец файла:

```python
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
        days=[
            day_availability(day, event_type.duration_minutes, now, busy) for day in days
        ],
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
```

- [ ] **Step 4: Запустить тесты и убедиться, что все проходят**

Run: `cd backend && uv run pytest tests/test_slots.py -v`
Expected: PASS, 15 passed

- [ ] **Step 5: Закоммитить**

```bash
git add backend/app/slots.py backend/tests/test_slots.py
git commit -m "feat(backend): subtract bookings and lead time from slot availability"
```

---

### Task 5: Хранилище, ошибки и ручки чтения типов событий

**Files:**
- Create: `backend/app/storage.py`
- Create: `backend/app/errors.py`
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/api/deps.py`
- Create: `backend/app/api/event_types.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/conftest.py`
- Test: `backend/tests/test_event_types.py`

**Interfaces:**
- Consumes: `app.schemas` (Task 2), `app.slots.build_availability` (Task 4), `app.clock.utc_now` (Task 1).
- Produces:
  - `app.storage.Storage` с методами `list_event_types() -> list[EventType]`, `get_event_type(event_type_id: str) -> EventType | None`, `has_event_type(event_type_id: str) -> bool`, `add_event_type(event_type: EventType) -> None`, `list_bookings() -> list[Booking]`, `add_booking(booking: Booking) -> None`, `busy_intervals() -> list[tuple[datetime, datetime]]` и атрибутом `lock: threading.Lock`; функция-зависимость `app.storage.get_storage() -> Storage`.
  - `app.errors.ApiError`, `NotFoundError`, `SlotConflictError`, `EventTypeConflictError`, `ValidationFailedError(field, message)`, `register_error_handlers(app: FastAPI) -> None`, константа `VALIDATION_MESSAGE`.
  - `app.api.deps.StorageDep`, `app.api.deps.NowDep` — Annotated-зависимости.
  - `app.api.router` — агрегирующий роутер с префиксом `/api`.
  - Фикстуры `storage`, `now`, `client` и константы `FROZEN_NOW`, `INTRO_CALL`, `DESIGN_REVIEW` в `tests/conftest.py`.

- [ ] **Step 1: Создать `backend/tests/conftest.py`**

```python
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
```

- [ ] **Step 2: Написать падающий тест `backend/tests/test_event_types.py`**

```python
"""Ручки чтения типов событий и свободных слотов."""

from fastapi.testclient import TestClient

from app.schemas import EventType
from app.storage import Storage
from tests.conftest import DESIGN_REVIEW, INTRO_CALL


def add_event_type(storage: Storage, payload: dict) -> None:
    """Положить тип события в хранилище напрямую, минуя админскую ручку."""
    storage.add_event_type(EventType.model_validate(payload))


def test_event_types_are_empty_on_a_fresh_start(client: TestClient):
    response = client.get("/api/event-types")

    assert response.status_code == 200
    assert response.json() == []


def test_event_types_are_listed_with_contract_field_names(
    client: TestClient, storage: Storage
):
    add_event_type(storage, INTRO_CALL)
    add_event_type(storage, DESIGN_REVIEW)

    response = client.get("/api/event-types")

    assert response.status_code == 200
    assert response.json() == [INTRO_CALL, DESIGN_REVIEW]


def test_event_type_is_readable_by_id(client: TestClient, storage: Storage):
    add_event_type(storage, INTRO_CALL)

    response = client.get("/api/event-types/intro-call")

    assert response.status_code == 200
    assert response.json() == INTRO_CALL


def test_unknown_event_type_id_gives_not_found(client: TestClient):
    response = client.get("/api/event-types/unknown")

    assert response.status_code == 404
    assert response.json() == {"code": "not_found", "message": "Тип события не найден."}


def test_malformed_event_type_id_in_the_path_gives_not_found(client: TestClient):
    # Контракт для этой ручки разрешает только 200 и 404, поэтому паттерн id
    # в пути не проверяется: неправильно оформленный id — это просто «не найден».
    response = client.get("/api/event-types/Intro_Call")

    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


def test_slots_cover_the_whole_window(client: TestClient, storage: Storage):
    add_event_type(storage, INTRO_CALL)

    response = client.get("/api/event-types/intro-call/slots")

    assert response.status_code == 200
    body = response.json()
    assert body["eventTypeId"] == "intro-call"
    assert body["slotDurationMinutes"] == 30
    assert body["windowStartDate"] == "2026-08-05"
    assert body["windowEndDate"] == "2026-08-18"
    assert len(body["days"]) == 14
    assert body["days"][0]["date"] == "2026-08-05"
    assert body["days"][0]["slots"][0] == {
        "startAt": "2026-08-05T10:00:00Z",
        "endAt": "2026-08-05T10:30:00Z",
    }
    # 08.08 — суббота: день присутствует, слотов нет.
    assert body["days"][3] == {"date": "2026-08-08", "slots": []}


def test_slots_of_unknown_event_type_give_not_found(client: TestClient):
    response = client.get("/api/event-types/unknown/slots")

    assert response.status_code == 404
    assert response.json()["code"] == "not_found"
```

- [ ] **Step 3: Запустить тест и убедиться, что он падает**

Run: `cd backend && uv run pytest tests/test_event_types.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.storage'`

- [ ] **Step 4: Создать `backend/app/storage.py`**

```python
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

    def add_booking(self, booking: Booking) -> None:
        self._bookings[booking.id] = booking

    def busy_intervals(self) -> list[tuple[datetime, datetime]]:
        """Интервалы всех броней: правило занятости не различает типы событий."""
        return [(booking.start_at, booking.end_at) for booking in self._bookings.values()]


_storage = Storage()


def get_storage() -> Storage:
    """Зависимость FastAPI: тесты подменяют её на чистое хранилище."""
    return _storage
```

- [ ] **Step 5: Создать `backend/app/errors.py`**

```python
"""Ошибки контракта и их перевод в HTTP-ответы.

FastAPI по умолчанию отдаёт `422 {"detail": [...]}`, что контракту не
соответствует, поэтому его ошибку валидации мы перехватываем и переписываем.
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

VALIDATION_MESSAGE = "Запрос не прошёл валидацию."

_LOCATION_PREFIXES = frozenset({"body", "query", "path", "header", "cookie"})


class ApiError(Exception):
    """Ошибка со статусом и кодом из контракта."""

    status_code: int = 500
    code: str = "internal_error"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message
        self.errors: list[dict[str, str]] = []


class NotFoundError(ApiError):
    status_code = 404
    code = "not_found"


class SlotConflictError(ApiError):
    status_code = 409
    code = "slot_already_booked"


class EventTypeConflictError(ApiError):
    status_code = 409
    code = "event_type_already_exists"


class ValidationFailedError(ApiError):
    """Ошибка валидации, которую находим сами, — например время вне сетки слотов."""

    status_code = 422
    code = "validation_failed"

    def __init__(self, field: str, message: str) -> None:
        super().__init__(VALIDATION_MESSAGE)
        self.errors = [{"field": field, "message": message}]


def _field_name(location: tuple[object, ...]) -> str:
    """Имя поля для FieldError: путь из loc без префикса body/query/path."""
    parts = list(location)
    if parts and parts[0] in _LOCATION_PREFIXES:
        parts = parts[1:]
    return ".".join(str(part) for part in parts) or "body"


def _error_body(code: str, message: str, errors: list[dict[str, str]]) -> dict[str, object]:
    body: dict[str, object] = {"code": code, "message": message}
    if errors:
        body["errors"] = errors
    return body


def register_error_handlers(app: FastAPI) -> None:
    """Подключить обработчики, приводящие ошибки к форме из контракта."""

    @app.exception_handler(ApiError)
    async def handle_api_error(_: Request, error: ApiError) -> JSONResponse:
        return JSONResponse(
            status_code=error.status_code,
            content=_error_body(error.code, error.message, error.errors),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_request_validation_error(
        _: Request, error: RequestValidationError
    ) -> JSONResponse:
        errors = [
            {"field": _field_name(item["loc"]), "message": item["msg"]}
            for item in error.errors()
        ]
        return JSONResponse(
            status_code=422,
            content=_error_body("validation_failed", VALIDATION_MESSAGE, errors),
        )
```

Заметка для реализующего: `item["msg"]` — сообщение pydantic, по-английски. Переводить их не будем: фронтенд валидирует формы сам и до пользователя эти строки почти не доходят, а собственный словарь переводов пришлось бы поддерживать вручную. Наши собственные сообщения (`ValidationFailedError`) — по-русски.

- [ ] **Step 6: Создать `backend/app/api/deps.py`**

```python
"""Зависимости, общие для роутеров."""

from datetime import datetime
from typing import Annotated

from fastapi import Depends

from app.clock import utc_now
from app.storage import Storage, get_storage

StorageDep = Annotated[Storage, Depends(get_storage)]
NowDep = Annotated[datetime, Depends(utc_now)]
```

- [ ] **Step 7: Создать `backend/app/api/event_types.py`**

```python
"""Ручки гостя: типы событий и свободные слоты."""

from fastapi import APIRouter

from app import slots
from app.api.deps import NowDep, StorageDep
from app.errors import NotFoundError
from app.schemas import Availability, EventType
from app.storage import Storage

router = APIRouter(prefix="/event-types", tags=["Гость: типы событий и слоты"])


def require_event_type(storage: Storage, event_type_id: str) -> EventType:
    """Найти тип события или ответить 404 — контракт другого варианта не даёт."""
    event_type = storage.get_event_type(event_type_id)
    if event_type is None:
        raise NotFoundError("Тип события не найден.")
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
```

- [ ] **Step 8: Создать `backend/app/api/__init__.py`**

```python
"""Сборка роутеров под общим префиксом /api — как в @server контракта."""

from fastapi import APIRouter

from app.api import event_types

router = APIRouter(prefix="/api")
router.include_router(event_types.router)
```

- [ ] **Step 9: Подключить роутер и обработчики ошибок в `backend/app/main.py`**

Заменить содержимое `create_app` целиком (импорты дописать вверху файла):

```python
"""Сборка приложения FastAPI."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import api, config
from app.errors import register_error_handlers


def create_app() -> FastAPI:
    """Собрать приложение. Отдельная функция — чтобы тесты брали чистый экземпляр."""
    app = FastAPI(
        title="Booking Calendar API",
        description="HTTP API календаря бронирования. Хранилище в памяти.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(config.CORS_ORIGINS),
        allow_methods=["GET", "POST"],
        allow_headers=["Accept", "Content-Type"],
    )
    register_error_handlers(app)
    app.include_router(api.router)
    return app


app = create_app()
```

- [ ] **Step 10: Запустить тесты и убедиться, что они проходят**

Run: `cd backend && uv run pytest -v`
Expected: PASS, 38 passed (2 в `test_app`, 14 в `test_schemas`, 15 в `test_slots`, 7 в `test_event_types`)

- [ ] **Step 11: Закоммитить**

```bash
git add backend/app backend/tests
git commit -m "feat(backend): serve event types and slots from in-memory storage"
```

---

### Task 6: Создание типа события владельцем

**Files:**
- Create: `backend/app/api/admin.py`
- Modify: `backend/app/api/__init__.py`
- Test: `backend/tests/test_admin.py`

**Interfaces:**
- Consumes: `app.api.deps.StorageDep` (Task 5), `app.errors.EventTypeConflictError` (Task 5), `app.schemas.CreateEventTypeRequest`, `EventType` (Task 2).
- Produces: `app.api.admin.router` с ручкой `POST /admin/event-types`.

- [ ] **Step 1: Написать падающий тест `backend/tests/test_admin.py`**

```python
"""Ручки владельца календаря: создание типов событий, предстоящие встречи."""

from fastapi.testclient import TestClient

from tests.conftest import INTRO_CALL


def test_owner_creates_event_type(client: TestClient):
    response = client.post("/api/admin/event-types", json=INTRO_CALL)

    assert response.status_code == 201
    assert response.json() == INTRO_CALL


def test_created_event_type_appears_in_the_guest_list(client: TestClient):
    client.post("/api/admin/event-types", json=INTRO_CALL)

    assert client.get("/api/event-types").json() == [INTRO_CALL]
    assert client.get("/api/event-types/intro-call").json() == INTRO_CALL


def test_duplicate_id_gives_conflict(client: TestClient):
    client.post("/api/admin/event-types", json=INTRO_CALL)

    response = client.post("/api/admin/event-types", json={**INTRO_CALL, "name": "Другое"})

    assert response.status_code == 409
    assert response.json() == {
        "code": "event_type_already_exists",
        "message": "Тип события с таким id уже существует.",
    }


def test_malformed_id_gives_validation_error(client: TestClient):
    response = client.post("/api/admin/event-types", json={**INTRO_CALL, "id": "Intro_Call"})

    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "validation_failed"
    assert body["message"] == "Запрос не прошёл валидацию."
    assert [error["field"] for error in body["errors"]] == ["id"]


def test_duration_outside_bounds_gives_validation_error(client: TestClient):
    response = client.post("/api/admin/event-types", json={**INTRO_CALL, "durationMinutes": 0})

    assert response.status_code == 422
    assert [error["field"] for error in response.json()["errors"]] == ["durationMinutes"]


def test_missing_fields_are_reported_per_field(client: TestClient):
    response = client.post("/api/admin/event-types", json={"id": "intro-call"})

    assert response.status_code == 422
    fields = {error["field"] for error in response.json()["errors"]}
    assert fields == {"name", "description", "durationMinutes"}
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `cd backend && uv run pytest tests/test_admin.py -v`
Expected: FAIL — все тесты падают с 404, ручки `/api/admin/event-types` ещё нет

- [ ] **Step 3: Создать `backend/app/api/admin.py`**

```python
"""Ручки владельца календаря."""

from fastapi import APIRouter

from app.api.deps import StorageDep
from app.errors import EventTypeConflictError
from app.schemas import CreateEventTypeRequest, EventType

router = APIRouter(prefix="/admin", tags=["Владелец: админская часть"])


@router.post("/event-types", status_code=201, summary="Создать тип события")
def create_event_type(request: CreateEventTypeRequest, storage: StorageDep) -> EventType:
    """Владелец задаёт id сам, поэтому дубликат — обычный конфликт, а не ошибка сервера."""
    with storage.lock:
        if storage.has_event_type(request.id):
            raise EventTypeConflictError("Тип события с таким id уже существует.")
        storage.add_event_type(request)
    return request
```

- [ ] **Step 4: Подключить роутер в `backend/app/api/__init__.py`**

```python
"""Сборка роутеров под общим префиксом /api — как в @server контракта."""

from fastapi import APIRouter

from app.api import admin, event_types

router = APIRouter(prefix="/api")
router.include_router(event_types.router)
router.include_router(admin.router)
```

- [ ] **Step 5: Запустить тесты и убедиться, что они проходят**

Run: `cd backend && uv run pytest -v`
Expected: PASS, 44 passed (38 прежних плюс 6 в `test_admin`)

- [ ] **Step 6: Закоммитить**

```bash
git add backend/app/api backend/tests/test_admin.py
git commit -m "feat(backend): let the owner create event types"
```

---

### Task 7: Создание брони

**Files:**
- Create: `backend/app/booking.py`
- Create: `backend/app/api/bookings.py`
- Modify: `backend/app/api/__init__.py`
- Test: `backend/tests/test_bookings.py`

**Interfaces:**
- Consumes: `app.slots.is_bookable_start`, `app.slots.overlaps_any` (Task 4), `app.storage.Storage` (Task 5), `app.errors.NotFoundError`, `SlotConflictError`, `ValidationFailedError` (Task 5), `app.api.deps.StorageDep`, `NowDep` (Task 5), `app.schemas.Booking`, `CreateBookingRequest` (Task 2).
- Produces: `app.booking.create_booking(request: CreateBookingRequest, storage: Storage, now: datetime) -> Booking`, константа `app.booking.OFF_GRID_MESSAGE`, роутер `app.api.bookings.router` с ручкой `POST /bookings`.

- [ ] **Step 1: Написать падающий тест `backend/tests/test_bookings.py`**

```python
"""Создание брони: порядок проверок из контракта и правило занятости."""

from fastapi.testclient import TestClient

from tests.conftest import DESIGN_REVIEW, INTRO_CALL

GUEST = {
    "guestName": "Анна Петрова",
    "guestEmail": "anna@example.com",
    "comment": "Обсудим лендинг.",
}


def booking_payload(event_type_id: str, start_at: str, **overrides: object) -> dict:
    return {"eventTypeId": event_type_id, "startAt": start_at, **GUEST, **overrides}


def create_event_types(client: TestClient) -> None:
    client.post("/api/admin/event-types", json=INTRO_CALL)
    client.post("/api/admin/event-types", json=DESIGN_REVIEW)


def test_guest_books_a_free_slot(client: TestClient):
    create_event_types(client)

    response = client.post(
        "/api/bookings",
        json=booking_payload("intro-call", "2026-08-05T10:00:00Z"),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["eventType"] == INTRO_CALL
    assert body["startAt"] == "2026-08-05T10:00:00Z"
    assert body["endAt"] == "2026-08-05T10:30:00Z"
    assert body["createdAt"] == "2026-08-05T09:00:00Z"
    assert body["guestName"] == "Анна Петрова"
    assert body["comment"] == "Обсудим лендинг."
    assert len(body["id"]) == 36


def test_booking_without_comment_omits_the_field(client: TestClient):
    create_event_types(client)
    payload = booking_payload("intro-call", "2026-08-05T10:00:00Z")
    del payload["comment"]

    response = client.post("/api/bookings", json=payload)

    assert response.status_code == 201
    assert "comment" not in response.json()


def test_booked_slot_disappears_from_availability(client: TestClient):
    create_event_types(client)
    client.post("/api/bookings", json=booking_payload("intro-call", "2026-08-05T10:00:00Z"))

    days = client.get("/api/event-types/intro-call/slots").json()["days"]

    starts = [slot["startAt"] for slot in days[0]["slots"]]
    assert "2026-08-05T10:00:00Z" not in starts
    assert "2026-08-05T10:30:00Z" in starts


def test_unknown_event_type_gives_not_found(client: TestClient):
    response = client.post("/api/bookings", json=booking_payload("unknown", "2026-08-05T10:00:00Z"))

    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


def test_start_outside_the_grid_gives_validation_error(client: TestClient):
    create_event_types(client)

    response = client.post(
        "/api/bookings",
        json=booking_payload("intro-call", "2026-08-05T10:10:00Z"),
    )

    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "validation_failed"
    assert body["errors"] == [
        {
            "field": "startAt",
            "message": "Время должно совпадать с началом свободного слота внутри окна записи.",
        }
    ]


def test_start_in_the_past_gives_validation_error(client: TestClient):
    create_event_types(client)

    response = client.post(
        "/api/bookings",
        json=booking_payload("intro-call", "2026-08-04T10:00:00Z"),
    )

    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "startAt"


def test_start_after_the_window_gives_validation_error(client: TestClient):
    create_event_types(client)

    response = client.post(
        "/api/bookings",
        json=booking_payload("intro-call", "2026-08-19T10:00:00Z"),
    )

    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "startAt"


def test_start_on_a_weekend_gives_validation_error(client: TestClient):
    create_event_types(client)

    response = client.post(
        "/api/bookings",
        json=booking_payload("intro-call", "2026-08-08T10:00:00Z"),
    )

    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "startAt"


def test_start_without_timezone_gives_validation_error(client: TestClient):
    create_event_types(client)

    response = client.post(
        "/api/bookings",
        json=booking_payload("intro-call", "2026-08-05T10:00:00"),
    )

    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "startAt"


def test_malformed_email_gives_validation_error(client: TestClient):
    create_event_types(client)

    response = client.post(
        "/api/bookings",
        json=booking_payload("intro-call", "2026-08-05T10:00:00Z", guestEmail="oops"),
    )

    assert response.status_code == 422
    assert [error["field"] for error in response.json()["errors"]] == ["guestEmail"]


def test_booking_the_same_slot_twice_gives_conflict(client: TestClient):
    create_event_types(client)
    payload = booking_payload("intro-call", "2026-08-05T10:00:00Z")
    client.post("/api/bookings", json=payload)

    response = client.post("/api/bookings", json=payload)

    assert response.status_code == 409
    assert response.json() == {
        "code": "slot_already_booked",
        "message": "Это время уже занято другой бронью. Обновите список свободных слотов.",
    }


def test_overlapping_booking_of_another_event_type_gives_conflict(client: TestClient):
    create_event_types(client)
    # Часовая встреча 10:00–11:00 закрывает получасовой слот 10:30.
    client.post("/api/bookings", json=booking_payload("design-review", "2026-08-05T10:00:00Z"))

    response = client.post(
        "/api/bookings",
        json=booking_payload("intro-call", "2026-08-05T10:30:00Z"),
    )

    assert response.status_code == 409
    assert response.json()["code"] == "slot_already_booked"


def test_adjacent_booking_is_allowed(client: TestClient):
    create_event_types(client)
    client.post("/api/bookings", json=booking_payload("design-review", "2026-08-05T10:00:00Z"))

    response = client.post(
        "/api/bookings",
        json=booking_payload("intro-call", "2026-08-05T11:00:00Z"),
    )

    assert response.status_code == 201
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `cd backend && uv run pytest tests/test_bookings.py -v`
Expected: FAIL — все тесты падают с 404, ручки `/api/bookings` ещё нет

- [ ] **Step 3: Создать `backend/app/booking.py`**

```python
"""Правила создания брони — без HTTP, чтобы их можно было читать целиком."""

from datetime import datetime, timedelta
from uuid import uuid4

from app import slots
from app.errors import NotFoundError, SlotConflictError, ValidationFailedError
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
        raise NotFoundError("Тип события не найден.")

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
```

- [ ] **Step 4: Создать `backend/app/api/bookings.py`**

```python
"""Ручка гостя: создание брони."""

from fastapi import APIRouter

from app import booking as booking_rules
from app.api.deps import NowDep, StorageDep
from app.schemas import Booking, CreateBookingRequest

router = APIRouter(prefix="/bookings", tags=["Гость: бронирование"])


@router.post(
    "",
    status_code=201,
    response_model_exclude_none=True,
    summary="Создать бронирование",
)
def create_booking(request: CreateBookingRequest, storage: StorageDep, now: NowDep) -> Booking:
    """Пустой comment из ответа выкидываем: в контракте поле необязательное, не nullable."""
    return booking_rules.create_booking(request, storage, now)
```

- [ ] **Step 5: Подключить роутер в `backend/app/api/__init__.py`**

```python
"""Сборка роутеров под общим префиксом /api — как в @server контракта."""

from fastapi import APIRouter

from app.api import admin, bookings, event_types

router = APIRouter(prefix="/api")
router.include_router(event_types.router)
router.include_router(bookings.router)
router.include_router(admin.router)
```

- [ ] **Step 6: Запустить тесты и убедиться, что они проходят**

Run: `cd backend && uv run pytest -v`
Expected: PASS, 57 passed (44 прежних плюс 13 в `test_bookings`)

- [ ] **Step 7: Закоммитить**

```bash
git add backend/app backend/tests/test_bookings.py
git commit -m "feat(backend): create bookings and enforce the busy-time rule"
```

---

### Task 8: Предстоящие встречи владельца

**Files:**
- Modify: `backend/app/api/admin.py` (дописать ручку после `create_event_type`)
- Test: `backend/tests/test_admin.py` (дописать тесты)

**Interfaces:**
- Consumes: `app.api.deps.StorageDep`, `NowDep` (Task 5), `app.schemas.Booking` (Task 2), ручка `POST /api/bookings` (Task 7).
- Produces: ручка `GET /admin/bookings/upcoming` в `app.api.admin.router`.

- [ ] **Step 1: Дописать падающие тесты в `backend/tests/test_admin.py`**

Заменить блок импортов на:

```python
from datetime import datetime, timedelta
from uuid import uuid4

from fastapi.testclient import TestClient

from app.schemas import Booking, EventType
from app.storage import Storage
from tests.conftest import DESIGN_REVIEW, INTRO_CALL
```

Дописать в конец файла:

```python
GUEST = {"guestName": "Анна Петрова", "guestEmail": "anna@example.com"}


def book(client: TestClient, event_type_id: str, start_at: str) -> None:
    client.post(
        "/api/bookings",
        json={"eventTypeId": event_type_id, "startAt": start_at, **GUEST},
    )


def test_upcoming_bookings_are_empty_on_a_fresh_start(client: TestClient):
    response = client.get("/api/admin/bookings/upcoming")

    assert response.status_code == 200
    assert response.json() == []


def test_upcoming_bookings_of_all_event_types_are_sorted_by_start(client: TestClient):
    client.post("/api/admin/event-types", json=INTRO_CALL)
    client.post("/api/admin/event-types", json=DESIGN_REVIEW)
    book(client, "design-review", "2026-08-07T14:00:00Z")
    book(client, "intro-call", "2026-08-05T10:00:00Z")
    book(client, "intro-call", "2026-08-06T11:30:00Z")

    response = client.get("/api/admin/bookings/upcoming")

    assert response.status_code == 200
    body = response.json()
    assert [item["startAt"] for item in body] == [
        "2026-08-05T10:00:00Z",
        "2026-08-06T11:30:00Z",
        "2026-08-07T14:00:00Z",
    ]
    assert [item["eventType"]["id"] for item in body] == [
        "intro-call",
        "intro-call",
        "design-review",
    ]


def test_past_bookings_are_excluded(client: TestClient, storage: Storage, now: datetime):
    event_type = EventType.model_validate(INTRO_CALL)
    storage.add_event_type(event_type)
    # Бронь в прошлом создать через ручку нельзя — кладём её в хранилище напрямую.
    storage.add_booking(
        Booking(
            id=uuid4(),
            event_type=event_type,
            start_at=now - timedelta(days=1),
            end_at=now - timedelta(days=1) + timedelta(minutes=30),
            guest_name="Игорь Северов",
            guest_email="igor@example.com",
            created_at=now - timedelta(days=2),
        )
    )
    book(client, "intro-call", "2026-08-05T10:00:00Z")

    response = client.get("/api/admin/bookings/upcoming")

    assert [item["startAt"] for item in response.json()] == ["2026-08-05T10:00:00Z"]


def test_booking_without_comment_omits_the_field(client: TestClient):
    client.post("/api/admin/event-types", json=INTRO_CALL)
    book(client, "intro-call", "2026-08-05T10:00:00Z")

    assert "comment" not in client.get("/api/admin/bookings/upcoming").json()[0]
```

- [ ] **Step 2: Запустить тесты и убедиться, что новые падают**

Run: `cd backend && uv run pytest tests/test_admin.py -v`
Expected: FAIL — новые тесты падают с 404, ручки `/api/admin/bookings/upcoming` ещё нет

- [ ] **Step 3: Дописать `backend/app/api/admin.py`**

Заменить блок импортов на:

```python
from fastapi import APIRouter

from app.api.deps import NowDep, StorageDep
from app.errors import EventTypeConflictError
from app.schemas import Booking, CreateEventTypeRequest, EventType
```

Дописать в конец файла:

```python
@router.get(
    "/bookings/upcoming",
    response_model_exclude_none=True,
    summary="Предстоящие встречи",
)
def list_upcoming_bookings(storage: StorageDep, now: NowDep) -> list[Booking]:
    """Брони всех типов событий, начинающиеся не раньше текущего момента."""
    upcoming = [booking for booking in storage.list_bookings() if booking.start_at >= now]
    return sorted(upcoming, key=lambda booking: booking.start_at)
```

- [ ] **Step 4: Запустить тесты и убедиться, что они проходят**

Run: `cd backend && uv run pytest -v`
Expected: PASS, 61 passed (57 прежних плюс 4 новых в `test_admin`)

- [ ] **Step 5: Закоммитить**

```bash
git add backend/app/api/admin.py backend/tests/test_admin.py
git commit -m "feat(backend): list upcoming bookings for the owner"
```

---

### Task 9: README и финальная проверка

**Files:**
- Create: `backend/README.md`
- Modify: `README.md` (корневой — добавить раздел про бэкенд)

**Interfaces:**
- Consumes: всё готовое приложение.
- Produces: документацию. Кода не добавляет.

- [ ] **Step 1: Отформатировать код и прогнать линтер**

```bash
cd backend
uv run ruff format .
uv run ruff check --fix .
uv run ruff check .
```

Expected: последняя команда печатает `All checks passed!`. Если остались
замечания, которые `--fix` не снял, — исправить их руками и перепроверить.

- [ ] **Step 2: Прогнать все тесты**

Run: `cd backend && uv run pytest -v`
Expected: PASS, 61 passed

- [ ] **Step 3: Поднять сервис и проверить сценарий вручную**

```bash
cd backend
uv run uvicorn app.main:app --port 3000 &
sleep 2
curl -s http://localhost:3000/api/event-types                      # []
curl -s -X POST http://localhost:3000/api/admin/event-types \
  -H 'Content-Type: application/json' \
  -d '{"id":"intro-call","name":"Знакомство","description":"Короткий созвон.","durationMinutes":30}'
curl -s http://localhost:3000/api/event-types/intro-call/slots | head -c 400
```

Expected: пустой список, затем 201 с созданным типом, затем окно из 14 дней. Остановить сервер после проверки.

- [ ] **Step 4: Создать `backend/README.md`**

````markdown
# Booking Calendar — бэкенд

Реализация контракта [spec/main.tsp](../spec/main.tsp) на FastAPI.
Дизайн: [docs/superpowers/specs/2026-08-05-backend-fastapi-design.md](../docs/superpowers/specs/2026-08-05-backend-fastapi-design.md).

## Запуск

```bash
uv sync
uv run uvicorn app.main:app --port 3000 --reload
```

Ручки — под префиксом `/api`, как в `@server` контракта:
`http://localhost:3000/api/event-types`. Интерактивная документация,
сгенерированная FastAPI, — на `http://localhost:3000/docs`.

## Тесты и линтер

```bash
uv run pytest
uv run ruff check .
```

## Хранилище в памяти

Данные живут в процессе и пропадают при рестарте — базы данных на этом шаге нет.
Хранилище стартует пустым, поэтому сразу после запуска `GET /api/event-types`
возвращает `[]`, и главная страница фронтенда будет пустой. Это ожидаемое
поведение: сначала владелец создаёт тип события.

```bash
curl -X POST http://localhost:3000/api/admin/event-types \
  -H 'Content-Type: application/json' \
  -d '{"id":"intro-call","name":"Знакомство","description":"Короткий созвон.","durationMinutes":30}'
```

## Правила, которые считает сервер

- **Расписание.** Слоты формируются на будни, 10:00–18:00 UTC, шаг равен
  `durationMinutes` типа события. Слот попадает в сетку, только если успевает
  закончиться до 18:00: для 90-минутной встречи последний слот — 16:00.
  Выходные присутствуют в ответе с пустым списком слотов.
- **Окно записи.** 14 дней, первый — текущая дата по UTC.
- **Lead time.** Слот доступен, если начнётся не раньше чем через 5 минут.
- **Занятость.** Пересечение интервалов двух броней запрещено независимо от типа
  события: часовая встреча в 10:00 закрывает получасовой слот в 10:30. Стык
  интервалов пересечением не считается — 11:00 после встречи 10:00–11:00 свободно.

Значения расписания — константы в [app/config.py](app/config.py).

## Ошибки

| Код | `code` | Когда |
|---|---|---|
| 404 | `not_found` | Неизвестный `eventTypeId` |
| 409 | `slot_already_booked` | Пересечение с существующей бронью |
| 409 | `event_type_already_exists` | Тип события с таким `id` уже есть |
| 422 | `validation_failed` | Ошибки полей, детали в `errors[]` |

Сообщения в `errors[].message` для ошибок схемы приходят от pydantic и написаны
по-английски; собственные проверки сервера (например время вне сетки слотов)
отвечают по-русски.

## Отличия от Prism-мока

Мок из `spec/` был stateless: созданная бронь не появлялась в списке
предстоящих, а `409` приходилось запрашивать заголовком `Prefer`. Здесь
состояние настоящее — заголовок `Prefer` игнорируется, коды ответов зависят
от данных.

Чтобы фронтенд ходил сюда, а не в мок, поменяйте `frontend/.env`:

```
VITE_API_BASE_URL=http://localhost:3000/api
```

CORS разрешён для `http://localhost:5173` (Vite dev) и `http://localhost:4173`
(Vite preview) — список в [app/config.py](app/config.py).

## Структура

| Файл | Ответственность |
|---|---|
| `app/main.py` | Сборка приложения: CORS, обработчики ошибок, роутеры |
| `app/config.py` | Расписание, окно записи, lead time, CORS-адреса |
| `app/clock.py` | `utc_now()` как зависимость — тесты её замораживают |
| `app/schemas.py` | Модели контракта, camelCase на проводе, формат времени |
| `app/errors.py` | Ошибки контракта и их перевод в HTTP-ответы |
| `app/storage.py` | Хранилище в памяти |
| `app/slots.py` | Сетка слотов, окно записи, доступность — чистые функции |
| `app/booking.py` | Правила создания брони |
| `app/api/` | Роутеры: типы событий, бронирование, админская часть |
````

- [ ] **Step 5: Дописать раздел в корневой `README.md`**

Добавить в конец файла:

```markdown
## Состав проекта

- [spec/](spec/) — контракт API на TypeSpec и Prism-мок;
- [frontend/](frontend/) — интерфейс на React + Mantine;
- [backend/](backend/) — реализация контракта на FastAPI с хранилищем в памяти.
```

- [ ] **Step 6: Закоммитить**

```bash
git add backend/README.md README.md
git commit -m "docs(backend): document how to run the service and its booking rules"
```

---

## Проверка плана против дизайна

| Требование дизайна | Где реализуется |
|---|---|
| Структура `backend/app/...` | Task 1, 2, 3, 5, 7 |
| Расписание: будни, 10:00–18:00 UTC, шаг = длительность | Task 1 (`config.py`), Task 3 (`day_grid`) |
| Окно записи 14 дней от текущей даты UTC | Task 3 (`window_dates`), Task 4 (`build_availability`) |
| Lead time 5 минут | Task 4 |
| Правило занятости по пересечению интервалов, без учёта типа | Task 4 (`overlaps_any`), Task 7 |
| Порядок проверок 422 → 404 → 422 → 409 | Task 7 (`booking.py`) |
| Lock вокруг проверки занятости и вставки | Task 7 |
| `endAt` считает сервер | Task 7 |
| Формат ошибок контракта, перехват `RequestValidationError` | Task 5 (`errors.py`), Task 6 (тесты формы) |
| Паттерн `eventTypeId` в пути не проверяется → 404 | Task 5 |
| Время `...Z` с точностью до секунд, наивное отклоняется | Task 2 |
| `utc_now()` как зависимость, подмена в тестах | Task 1, Task 5 (`conftest.py`) |
| CORS для dev-адресов Vite | Task 1 |
| Пустое хранилище на старте | Task 5 (тест), Task 9 (README) |
| Тесты: сетка без HTTP, ручки через HTTP | Task 3, 4 (чистые), Task 5–8 (HTTP) |

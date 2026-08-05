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

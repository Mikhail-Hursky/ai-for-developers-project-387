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

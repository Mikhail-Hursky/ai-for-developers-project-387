"""Ручки владельца календаря: создание типов событий, предстоящие встречи."""

from datetime import datetime, timedelta
from uuid import uuid4

from fastapi.testclient import TestClient

from app.schemas import Booking, EventType
from app.storage import Storage
from tests.conftest import DESIGN_REVIEW, INTRO_CALL


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


def test_upcoming_bookings_of_all_event_types_are_sorted_by_start(
    client: TestClient,
):
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

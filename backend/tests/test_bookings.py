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

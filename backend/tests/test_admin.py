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

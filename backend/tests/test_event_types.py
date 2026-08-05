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

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


def test_preflight_allows_prefer_header():
    """Фронтенд шлёт `Prefer` на страницу бронирования — CORS не должен его отвергать."""
    client = TestClient(create_app())

    response = client.options(
        "/api/event-types/intro-call",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "prefer",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"

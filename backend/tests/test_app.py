"""Проверки сборки приложения: CORS для dev-адресов фронтенда и /openapi.json."""

from fastapi.testclient import TestClient

from app.main import create_app

PREFLIGHT_HEADERS = {"Access-Control-Request-Method": "GET"}
STOCK_VALIDATION_ERROR_REF = "#/components/schemas/HTTPValidationError"


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


def _response_codes(openapi: dict, path: str, method: str) -> set[str]:
    return set(openapi["paths"][path][method]["responses"].keys())


def test_openapi_documents_only_contract_response_codes():
    """/docs не должен обещать коды ответов, которых контракт не даёт."""
    client = TestClient(create_app())

    openapi = client.get("/openapi.json").json()

    assert _response_codes(openapi, "/api/event-types", "get") == {"200"}
    assert _response_codes(openapi, "/api/event-types/{event_type_id}", "get") == {"200", "404"}
    assert _response_codes(openapi, "/api/event-types/{event_type_id}/slots", "get") == {
        "200",
        "404",
    }
    assert _response_codes(openapi, "/api/bookings", "post") == {"201", "404", "409", "422"}
    assert _response_codes(openapi, "/api/admin/event-types", "post") == {"201", "409", "422"}
    assert _response_codes(openapi, "/api/admin/bookings/upcoming", "get") == {"200"}


def test_openapi_never_shows_the_stock_fastapi_validation_error():
    """422 должен быть контрактным (app/errors.py), а не сток-`HTTPValidationError`."""
    client = TestClient(create_app())

    openapi = client.get("/openapi.json").json()

    for methods in openapi["paths"].values():
        for operation in methods.values():
            error_422 = operation.get("responses", {}).get("422", {})
            schema = error_422.get("content", {}).get("application/json", {}).get("schema", {})
            assert schema.get("$ref") != STOCK_VALIDATION_ERROR_REF
    assert "HTTPValidationError" not in openapi["components"]["schemas"]

"""Раздача собранного SPA: fallback на index.html и приоритет /api."""

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import create_app

INDEX_HTML = "<!doctype html><title>Booking Calendar</title>"
APP_JS = "console.log('bundle');"


@pytest.fixture
def static_dir(tmp_path: Path) -> Path:
    """Каталог, похожий на frontend/dist: index.html и файл в assets/."""
    (tmp_path / "index.html").write_text(INDEX_HTML, encoding="utf-8")
    assets = tmp_path / "assets"
    assets.mkdir()
    (assets / "app.js").write_text(APP_JS, encoding="utf-8")
    return tmp_path


@pytest.fixture
def spa_client(static_dir: Path) -> Iterator[TestClient]:
    with TestClient(create_app(static_dir=static_dir)) as client:
        yield client


def test_serves_index_at_root(spa_client: TestClient):
    response = spa_client.get("/")

    assert response.status_code == 200
    assert response.text == INDEX_HTML


def test_serves_index_for_client_route(spa_client: TestClient):
    """У фронтенда клиентский роутинг: /admin на диске нет, но открыться должен."""
    response = spa_client.get("/admin")

    assert response.status_code == 200
    assert response.text == INDEX_HTML


def test_serves_real_file(spa_client: TestClient):
    response = spa_client.get("/assets/app.js")

    assert response.status_code == 200
    assert response.text == APP_JS


def test_api_wins_over_static_mount(spa_client: TestClient):
    """Монтирование в корень не должно перехватывать ручки контракта."""
    response = spa_client.get("/api/event-types")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_openapi_still_reachable(spa_client: TestClient):
    assert spa_client.get("/openapi.json").status_code == 200


def test_no_mount_without_directory(tmp_path: Path):
    """Без сборки фронтенда приложение поднимается как раньше."""
    with TestClient(create_app(static_dir=tmp_path / "missing")) as client:
        assert client.get("/admin").status_code == 404

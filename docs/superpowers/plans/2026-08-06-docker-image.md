# Docker-образ приложения — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Собрать один Docker-образ, в котором FastAPI отдаёт и `/api`, и
собранный SPA, слушая порт из переменной окружения `PORT`.

**Architecture:** Multi-stage Dockerfile: Node собирает фронтенд с
`VITE_API_BASE_URL=/api`, uv ставит зависимости бэкенда по `uv.lock`, финальный
слой на `python:3.13-slim-bookworm` запускает uvicorn. Бэкенд получает
монтирование каталога статики с fallback на `index.html` — это нужно для
клиентского роутинга SPA.

**Tech Stack:** Docker (multi-stage), Node 24, uv, Python 3.13, FastAPI /
Starlette `StaticFiles`, uvicorn, pytest.

Дизайн: [2026-08-06-docker-image-design.md](../specs/2026-08-06-docker-image-design.md).

## Global Constraints

- Python `>=3.13`, стадии `deps` и рантайма — оба `bookworm-slim`, иначе
  скопированный venv не заработает.
- Node в стадии сборки — `24`, как в `.github/workflows/ci.yml`.
- Зависимости бэкенда ставятся `uv sync --frozen --no-dev`; `uv.lock` не
  обновляется.
- `line-length = 100` (ruff), правила `E, F, I, UP, B`. Строки Markdown — до
  100 символов.
- Комментарии и докстринги в коде — по-русски, как во всём `backend/app`.
- Существующие вызовы `create_app()` в `backend/tests/conftest.py` и
  `backend/app/main.py` менять нельзя: новый параметр только с дефолтом.
- Проверки бэкенда после каждой правки Python:
  `cd backend && uv run ruff check . && uv run ruff format --check . && uv run pytest`.
- **Коммиты — только по явной просьбе пользователя** (`CLAUDE.md`). Шаги
  «Commit» ниже выполняются, когда пользователь об этом попросит; формат —
  Conventional Commits с трейлером `Co-Authored-By`.

---

## Файлы

| Файл | Ответственность |
|---|---|
| Создать `backend/app/spa.py` | `SPAStaticFiles` и `mount_spa` — раздача SPA с fallback |
| Создать `backend/tests/test_spa.py` | Тесты раздачи статики и приоритета `/api` |
| Изменить `backend/app/config.py` | Константа `STATIC_DIR` |
| Изменить `backend/app/main.py` | Параметр `static_dir` у `create_app`, вызов `mount_spa` |
| Создать `Dockerfile` | Три стадии сборки |
| Создать `.dockerignore` | Контекст сборки |
| Изменить `README.md` | Раздел «Docker» |

---

## Task 1: Раздача собранного SPA бэкендом

**Files:**
- Create: `backend/app/spa.py`
- Create: `backend/tests/test_spa.py`
- Modify: `backend/app/config.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Consumes: `app.main.create_app`, `app.config`.
- Produces: `app.spa.SPAStaticFiles`, `app.spa.mount_spa(app: FastAPI,
  directory: Path) -> None`, `app.config.STATIC_DIR: Path`,
  `create_app(static_dir: Path | None = None) -> FastAPI`. Стадия рантайма
  Dockerfile (Task 2) кладёт статику в `/app/static`, куда и указывает
  `STATIC_DIR`.

- [x] **Step 1: Написать падающие тесты**

Создать `backend/tests/test_spa.py`:

```python
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
```

- [x] **Step 2: Убедиться, что тесты падают**

Run: `cd backend && uv run pytest tests/test_spa.py -v`
Expected: FAIL — `create_app() got an unexpected keyword argument 'static_dir'`.

- [x] **Step 3: Добавить `app/spa.py`**

```python
"""Раздача собранного SPA из каталога со сборкой фронтенда."""

from pathlib import Path

from fastapi import FastAPI
from starlette.exceptions import HTTPException
from starlette.responses import Response
from starlette.staticfiles import StaticFiles
from starlette.types import Scope


class SPAStaticFiles(StaticFiles):
    """StaticFiles, который на неизвестный путь отдаёт index.html.

    Роутинг фронтенда клиентский: файлов `/admin` и `/booking/<id>` на диске
    нет, но при прямом заходе или обновлении страницы браузер запрашивает
    именно их — без подмены пользователь получил бы 404 вместо приложения.
    """

    async def get_response(self, path: str, scope: Scope) -> Response:
        try:
            return await super().get_response(path, scope)
        except HTTPException as error:
            if error.status_code != 404:
                raise
            return await super().get_response("index.html", scope)


def mount_spa(app: FastAPI, directory: Path) -> None:
    """Смонтировать SPA в корень, если каталог со сборкой существует.

    Каталога нет — в образ фронтенд не клали или это рабочая копия; тогда
    приложение остаётся чистым API.
    """
    if not directory.is_dir():
        return
    app.mount("/", SPAStaticFiles(directory=directory, html=True), name="spa")
```

- [x] **Step 4: Добавить `STATIC_DIR` в `app/config.py`**

В начало файла — `from pathlib import Path` (после существующего
`from datetime import time`, порядок импортов проверит ruff `I`).
В конец файла:

```python
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
"""Каталог со сборкой фронтенда. В Docker-образе туда копируется frontend/dist;
в рабочей копии его нет, и SPA не монтируется — фронтенд поднимают отдельно."""
```

- [x] **Step 5: Подключить монтирование в `app/main.py`**

Добавить импорты `from pathlib import Path` и `from app.spa import mount_spa`,
изменить сигнатуру и вставить вызов сразу после `include_router`:

```python
def create_app(static_dir: Path | None = None) -> FastAPI:
    """Собрать приложение. Отдельная функция — чтобы тесты брали чистый экземпляр.

    `static_dir` переопределяет каталог со сборкой фронтенда; по умолчанию
    берётся config.STATIC_DIR.
    """
    ...
    app.include_router(api.router)
    # После роутеров: Starlette подбирает маршруты в порядке регистрации,
    # и монтирование в корень иначе перехватило бы /api, /docs и /openapi.json.
    mount_spa(app, config.STATIC_DIR if static_dir is None else static_dir)
```

- [x] **Step 6: Прогнать тесты и линтер**

Run: `cd backend && uv run ruff check . && uv run ruff format --check . && uv run pytest`
Expected: PASS — новые тесты зелёные, старые не сломались.

- [ ] **Step 7: Commit (по явной просьбе)**

```bash
git add backend/app/spa.py backend/app/config.py backend/app/main.py backend/tests/test_spa.py
git commit -m "feat(backend): serve the built SPA from the API process"
```

---

## Task 2: Dockerfile, .dockerignore и проверка образа

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

**Interfaces:**
- Consumes: `app.config.STATIC_DIR` из Task 1 — рантайм-стадия обязана положить
  статику в `/app/static`, а код в `/app/app`.
- Produces: образ `booking-calendar`, слушающий `${PORT:-8000}`.

- [x] **Step 1: Создать `.dockerignore`**

```
.git
.github
node_modules
frontend/node_modules
frontend/dist
frontend/.env
backend/.venv
backend/tests
e2e
spec
docs
**/__pycache__
**/.pytest_cache
**/.ruff_cache
```

`frontend/.env` — иначе локальный `http://localhost:3000/api` подменил бы
`VITE_API_BASE_URL` стадии сборки. `frontend/dist` и `backend/.venv` — чтобы
локальные артефакты не попадали в контекст.

- [x] **Step 2: Создать `Dockerfile`**

```dockerfile
# syntax=docker/dockerfile:1

# --- Стадия 1: сборка SPA ---------------------------------------------------
FROM node:24-alpine AS frontend
WORKDIR /app

# Манифесты отдельным слоем: правка исходников не инвалидирует кеш npm ci.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
# Относительный адрес: SPA ходит на тот же origin, откуда её отдали. Значение
# вшивается в бандл на сборке, в рантайме его уже не переопределить.
ENV VITE_API_BASE_URL=/api
RUN npm run build

# --- Стадия 2: зависимости бэкенда ------------------------------------------
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS deps
WORKDIR /app

# copy — на слоях overlayfs жёсткие ссылки из кеша uv не работают;
# never — брать питон из образа, а не скачивать свой: иначе venv сошлётся
# на интерпретатор, которого нет в рантайм-слое.
ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_DOWNLOADS=never

COPY backend/pyproject.toml backend/uv.lock ./
# --frozen — строго по uv.lock, как в CI; --no-dev — без pytest, ruff и httpx.
RUN uv sync --frozen --no-dev

# --- Стадия 3: рантайм ------------------------------------------------------
# Тот же дистрибутив и та же минорная версия Python, что у стадии deps:
# скопированный venv ссылается на /usr/local/bin/python3.13.
FROM python:3.13-slim-bookworm
WORKDIR /app

RUN useradd --create-home --uid 1000 app

COPY --from=deps     /app/.venv /app/.venv
COPY --from=frontend /app/dist  /app/static
COPY backend/app                /app/app

ENV PATH=/app/.venv/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

USER app
EXPOSE 8000

# sh -c — форма exec не разворачивает переменные, uvicorn получил бы литерал
# $PORT; exec — чтобы uvicorn стал PID 1 и получил SIGTERM при остановке.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

- [x] **Step 3: Собрать образ**

Run: `docker build -t booking-calendar .`
Expected: сборка проходит; `npm run build` (в нём `tsc --noEmit`) и
`uv sync --frozen` не ругаются.

- [x] **Step 4: Запустить с `PORT=8080` и проверить**

```bash
docker run --rm -d -e PORT=8080 -p 8080:8080 --name bc booking-calendar
curl -sf http://localhost:8080/            | head -c 100   # HTML SPA
curl -sf http://localhost:8080/admin       | head -c 100   # тот же HTML: fallback
curl -sf http://localhost:8080/api/event-types             # []
curl -sf -o /dev/null -w '%{http_code}\n' http://localhost:8080/docs   # 200
```

Expected: `/` и `/admin` отдают одинаковый HTML, `/api/event-types` → `[]`,
`/docs` → 200.

- [x] **Step 5: Проверить, что приложение живое, а не только статика**

```bash
curl -sf -X POST http://localhost:8080/api/admin/event-types \
  -H 'Content-Type: application/json' \
  -d '{"id":"docker-smoke","name":"Проверка","description":"Смоук.","durationMinutes":30}'
curl -sf http://localhost:8080/api/event-types
```

Expected: 201 на POST, созданный тип в списке.

- [x] **Step 6: Проверить остановку и другой порт**

```bash
time docker stop bc
docker run --rm -d -e PORT=9090 -p 9090:9090 --name bc9 booking-calendar
curl -sf -o /dev/null -w '%{http_code}\n' http://localhost:9090/api/event-types
docker stop bc9
```

Expected: `docker stop` укладывается примерно в секунду (значит `SIGTERM` дошёл
до uvicorn, а не съеден `sh`); на 9090 — 200.

- [ ] **Step 7: Commit (по явной просьбе)**

```bash
git add Dockerfile .dockerignore
git commit -m "build(docker): package the api and the spa into a single image"
```

---

## Task 3: Раздел «Docker» в README

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: имя образа и поведение `PORT` из Task 2.
- Produces: ничего для последующих задач.

- [x] **Step 1: Добавить раздел после «Состав проекта»**

```markdown
## Docker

Всё приложение целиком — один образ: FastAPI отдаёт и API, и собранный
интерфейс.

```bash
docker build -t booking-calendar .
docker run --rm -e PORT=8080 -p 8080:8080 booking-calendar
```

Порт берётся из переменной окружения `PORT` (по умолчанию `8000`). На
`http://localhost:8080/` — интерфейс, на `/api/...` — API, на `/docs` —
документация.

Фронтенд собирается внутри образа с `VITE_API_BASE_URL=/api`: SPA обращается к
тому же адресу, с которого её отдали, поэтому настраивать CORS и внешний адрес
API не нужно.

Хранилище бэкенда живёт в памяти процесса — типы встреч и брони пропадают при
перезапуске контейнера, а нескольких реплик у сервиса быть не может.
```

- [x] **Step 2: Проверить ссылки и ширину строк**

Строки — до 100 символов; команды совпадают с тем, что реально прогнано в
Task 2.

- [ ] **Step 3: Commit (по явной просьбе)**

```bash
git add README.md
git commit -m "docs: describe how to build and run the docker image"
```

---

## Self-review плана против спеки

| Раздел спеки | Задача |
|---|---|
| Три стадии Dockerfile | Task 2, Step 2 |
| `VITE_API_BASE_URL=/api` | Task 2, Step 2 |
| `CMD` с `sh -c`, `exec`, `${PORT:-8000}` | Task 2, Step 2 и Step 6 |
| Непривилегированный пользователь | Task 2, Step 2 (`useradd`, `USER app`) |
| `SPAStaticFiles` с fallback | Task 1, Step 3 |
| `mount_spa` после `include_router` | Task 1, Step 5 |
| `STATIC_DIR` в `config.py` | Task 1, Step 4 |
| `create_app(static_dir=...)` | Task 1, Step 5 |
| Пять тестов раздачи SPA | Task 1, Step 1 (их шесть: добавлен `/`) |
| Проверка образа вручную | Task 2, Steps 3–6 |
| `.dockerignore` | Task 2, Step 1 |
| Раздел в README | Task 3 |

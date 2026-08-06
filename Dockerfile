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

# copy — на overlayfs жёсткие ссылки из кеша uv не работают; never — брать
# питон из образа, а не скачивать свой: иначе venv сошлётся на интерпретатор,
# которого нет в рантайм-слое.
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

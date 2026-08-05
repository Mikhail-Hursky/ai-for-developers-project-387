"""Сборка приложения FastAPI."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import config


def create_app() -> FastAPI:
    """Собрать приложение. Отдельная функция — чтобы тесты брали чистый экземпляр."""
    app = FastAPI(
        title="Booking Calendar API",
        description="HTTP API календаря бронирования. Хранилище в памяти.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(config.CORS_ORIGINS),
        allow_methods=["GET", "POST"],
        allow_headers=["Accept", "Content-Type"],
    )
    return app


app = create_app()

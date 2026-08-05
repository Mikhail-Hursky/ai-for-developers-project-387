"""Сборка приложения FastAPI."""

from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from app import api, config
from app.errors import register_error_handlers

STOCK_VALIDATION_ERROR_REF = "#/components/schemas/HTTPValidationError"
"""Сток-схема FastAPI для 422. Сервер её не отдаёт: RequestValidationError
глобально переписывается в контрактный ValidationErrorResponse (app/errors.py)."""


def _without_stock_validation_error(schema: dict[str, Any]) -> dict[str, Any]:
    """Убрать 422 там, где OpenAPI показывает сток-схему, а не контрактную.

    Для ручек с телом запроса 422 объявлен явно через `responses` с моделью
    ValidationErrorResponse, поэтому сток-схема там уже не попадает в схему.
    Для ручек без тела FastAPI всё равно навязывает сток-422 из-за наличия
    path-параметра, даже если по контракту у ручки 422 нет вовсе — такой 422
    из документации вычищаем, раз сервер его не может отдать.
    """
    for methods in schema.get("paths", {}).values():
        for operation in methods.values():
            responses = operation.get("responses", {})
            error_422 = responses.get("422", {})
            schema_ref = (
                error_422.get("content", {}).get("application/json", {}).get("schema", {})
            ).get("$ref")
            if schema_ref == STOCK_VALIDATION_ERROR_REF:
                del responses["422"]
    schemas = schema.get("components", {}).get("schemas", {})
    schemas.pop("HTTPValidationError", None)
    schemas.pop("ValidationError", None)
    return schema


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
        allow_headers=list(config.CORS_ALLOW_HEADERS),
    )
    register_error_handlers(app)
    app.include_router(api.router)

    def custom_openapi() -> dict[str, Any]:
        if app.openapi_schema is None:
            schema = get_openapi(
                title=app.title,
                description=app.description,
                version=app.version,
                routes=app.routes,
            )
            app.openapi_schema = _without_stock_validation_error(schema)
        return app.openapi_schema

    app.openapi = custom_openapi
    return app


app = create_app()

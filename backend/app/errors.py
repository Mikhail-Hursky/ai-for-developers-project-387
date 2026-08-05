"""Ошибки контракта и их перевод в HTTP-ответы.

FastAPI по умолчанию отдаёт `422 {"detail": [...]}`, что контракту не
соответствует, поэтому его ошибку валидации мы перехватываем и переписываем.
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

VALIDATION_MESSAGE = "Запрос не прошёл валидацию."

_LOCATION_PREFIXES = frozenset({"body", "query", "path", "header", "cookie"})


class ApiError(Exception):
    """Ошибка со статусом и кодом из контракта."""

    status_code: int = 500
    code: str = "internal_error"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message
        self.errors: list[dict[str, str]] = []


class NotFoundError(ApiError):
    status_code = 404
    code = "not_found"


class SlotConflictError(ApiError):
    status_code = 409
    code = "slot_already_booked"


class EventTypeConflictError(ApiError):
    status_code = 409
    code = "event_type_already_exists"


class ValidationFailedError(ApiError):
    """Ошибка валидации, которую находим сами, — например время вне сетки слотов."""

    status_code = 422
    code = "validation_failed"

    def __init__(self, field: str, message: str) -> None:
        super().__init__(VALIDATION_MESSAGE)
        self.errors = [{"field": field, "message": message}]


def _field_name(location: tuple[object, ...]) -> str:
    """Имя поля для FieldError: путь из loc без префикса body/query/path."""
    parts = list(location)
    if parts and parts[0] in _LOCATION_PREFIXES:
        parts = parts[1:]
    return ".".join(str(part) for part in parts) or "body"


def _error_body(code: str, message: str, errors: list[dict[str, str]]) -> dict[str, object]:
    body: dict[str, object] = {"code": code, "message": message}
    if errors:
        body["errors"] = errors
    return body


def register_error_handlers(app: FastAPI) -> None:
    """Подключить обработчики, приводящие ошибки к форме из контракта."""

    @app.exception_handler(ApiError)
    async def handle_api_error(_: Request, error: ApiError) -> JSONResponse:
        return JSONResponse(
            status_code=error.status_code,
            content=_error_body(error.code, error.message, error.errors),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_request_validation_error(
        _: Request, error: RequestValidationError
    ) -> JSONResponse:
        errors = [
            {"field": _field_name(item["loc"]), "message": item["msg"]}
            for item in error.errors()
        ]
        return JSONResponse(
            status_code=422,
            content=_error_body("validation_failed", VALIDATION_MESSAGE, errors),
        )

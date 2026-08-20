"""Раздача собранного SPA из каталога со сборкой фронтенда."""

from pathlib import Path

from fastapi import FastAPI
from starlette.exceptions import HTTPException
from starlette.responses import Response
from starlette.staticfiles import StaticFiles
from starlette.types import Scope

RESERVED_PREFIXES = frozenset({"api", "docs", "redoc", "openapi.json"})
"""The first path segment that belongs to the backend, not the SPA.

Contract handlers and FastAPI's own service routes are registered before the
SPA mount and intercept matching paths themselves (see `create_app`). Only
requests under these prefixes that didn't match any such handler end up
here — i.e. requests that are invalid for the backend, not a frontend client
route.
"""


def _is_reserved_path(path: str) -> bool:
    return path.split("/", 1)[0] in RESERVED_PREFIXES


class SPAStaticFiles(StaticFiles):
    """StaticFiles, который на неизвестный путь отдаёт index.html.

    Роутинг фронтенда клиентский: файлов `/admin` и `/booking/<id>` на диске
    нет, но при прямом заходе или обновлении страницы браузер запрашивает
    именно их — без подмены пользователь получил бы 404 вместо приложения.

    The substitution must not happen for paths that belong to the backend
    (`/api/...`, `/docs`, `/openapi.json`, etc.): otherwise an unknown API
    route or a path with malformed percent-encoding would return
    `200 text/html` instead of `404`, and an API client would get the app's
    page where it expects JSON.
    """

    async def get_response(self, path: str, scope: Scope) -> Response:
        try:
            return await super().get_response(path, scope)
        except HTTPException as error:
            if error.status_code != 404 or _is_reserved_path(path):
                raise
            return await super().get_response("index.html", scope)


def mount_spa(app: FastAPI, directory: Path) -> None:
    """Смонтировать SPA в корень, если каталог со сборкой существует.

    Каталога нет — значит фронтенд в образ не клали или это рабочая копия;
    тогда приложение остаётся чистым API.
    """
    if not directory.is_dir():
        return
    app.mount("/", SPAStaticFiles(directory=directory, html=True), name="spa")

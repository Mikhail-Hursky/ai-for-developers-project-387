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

    Каталога нет — значит фронтенд в образ не клали или это рабочая копия;
    тогда приложение остаётся чистым API.
    """
    if not directory.is_dir():
        return
    app.mount("/", SPAStaticFiles(directory=directory, html=True), name="spa")

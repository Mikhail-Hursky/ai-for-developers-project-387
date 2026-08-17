"""Раздача собранного SPA из каталога со сборкой фронтенда."""

from pathlib import Path

from fastapi import FastAPI
from starlette.exceptions import HTTPException
from starlette.responses import Response
from starlette.staticfiles import StaticFiles
from starlette.types import Scope

RESERVED_PREFIXES = frozenset({"api", "docs", "redoc", "openapi.json"})
"""Первый сегмент пути, который принадлежит backend, а не SPA.

Ручки контракта и служебные маршруты FastAPI регистрируются раньше mount'а
SPA и перехватывают совпадающие пути сами (см. `create_app`). Сюда
попадают только те запросы под этими префиксами, что не совпали ни с одной
такой ручкой, — то есть заведомо невалидные для backend, а не клиентский
роут фронтенда.
"""


def _is_reserved_path(path: str) -> bool:
    return path.split("/", 1)[0] in RESERVED_PREFIXES


class SPAStaticFiles(StaticFiles):
    """StaticFiles, который на неизвестный путь отдаёт index.html.

    Роутинг фронтенда клиентский: файлов `/admin` и `/booking/<id>` на диске
    нет, но при прямом заходе или обновлении страницы браузер запрашивает
    именно их — без подмены пользователь получил бы 404 вместо приложения.

    Подмена не должна срабатывать для путей, которые по смыслу принадлежат
    backend (`/api/...`, `/docs`, `/openapi.json` и т.п.): иначе неизвестная
    API-ручка или путь с битой percent-кодировкой отдаст `200 text/html`
    вместо `404`, и API-клиент получит страницу приложения там, где ждёт JSON.
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

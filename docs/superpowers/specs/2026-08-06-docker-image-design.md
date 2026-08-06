# Docker-образ приложения — дизайн

Дата: 2026-08-06

## Задача

Собрать Docker-образ приложения. Контейнер должен слушать порт из переменной
окружения `PORT`.

Сейчас Docker в репозитории нет вообще: бэкенд поднимают через
`uv run uvicorn`, фронтенд — через `vite dev` или `vite preview`, а связывает их
`VITE_API_BASE_URL` из `frontend/.env`. Для деплоя на платформу, которая выдаёт
сервису один порт через `PORT` (Render, Railway, Fly), этого недостаточно.

## Решения

| Вопрос | Решение |
|---|---|
| Что внутри образа | Один образ: FastAPI отдаёт и `/api`, и собранный SPA |
| Кто раздаёт статику | Сам uvicorn через `StaticFiles`, без nginx и супервизора |
| Порт | `${PORT:-8000}`, читается в рантайме |
| Адрес API во фронтенде | `VITE_API_BASE_URL=/api` — относительный, тот же origin |
| Стадии сборки | `frontend` (Node) → `deps` (uv) → runtime (python:3.13-slim) |
| Пользователь в рантайме | Непривилегированный `app` |
| Правка прод-кода | Монтирование статики с SPA-fallback в `create_app()` |
| Размещение | `Dockerfile` и `.dockerignore` в корне репозитория |

Не делаем: `docker-compose.yml`, публикацию образа в реестр, job сборки в CI,
отдельную healthcheck-ручку, `HEALTHCHECK` в образе.

## Почему один образ, а не два

Требование «порт из `PORT`» описывает платформу, которая даёт сервису ровно один
входящий порт. Два контейнера (nginx со статикой + uvicorn с API) там пришлось бы
связывать проксированием и настраивать CORS на боевой домен, а `PORT` относился
бы только к одному из них. Один образ с одним origin снимает и то, и другое:
CORS вообще не участвует, потому что SPA ходит туда же, откуда её отдали.

## Почему uvicorn, а не nginx внутри контейнера

Nginx рядом с uvicorn в одном контейнере требует супервизора процессов
(supervisord, s6) и превращает контейнер в два жизненных цикла с одним PID 1 —
сигналы и коды выхода перестают быть однозначными. `StaticFiles` из Starlette
отдаёт файлы асинхронно и умеет `ETag`/`Last-Modified`; собранный SPA — это
несколько сотен килобайт с хешами в именах. Разница в производительности здесь
не имеет практического значения, а разница в сложности — имеет.

## Dockerfile

Три стадии, финальная не содержит ни Node, ни исходников фронтенда.

### 1. `frontend` — сборка SPA

База `node:24-alpine` (та же мажорная версия, что в CI).

```
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ENV VITE_API_BASE_URL=/api
RUN npm run build
```

`package*.json` копируются отдельным слоем: правка исходников не инвалидирует
кеш `npm ci`. `npm run build` — это `tsc --noEmit && vite build`, то есть
проверка типов входит в сборку образа.

`VITE_API_BASE_URL` читается на этапе сборки и вшивается в бандл. Значение
`/api` — относительный путь: `client.ts` срезает хвостовые слеши и подставляет
его в `fetch`, браузер разрешает адрес относительно origin страницы. Файл
`frontend/.env` (там `http://localhost:3000/api`) в образ не попадает —
исключён в `.dockerignore`.

### 2. `deps` — зависимости бэкенда

База `ghcr.io/astral-sh/uv:python3.13-bookworm-slim`.

```
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev
```

`--frozen` — ставить строго по `uv.lock`, как в CI; `--no-dev` — без pytest,
ruff и httpx, они в рантайме не нужны. Результат — venv в `/app/.venv`.

### 3. Рантайм

База `python:3.13-slim-bookworm` — тот же дистрибутив и та же минорная версия
Python, что у стадии `deps`, иначе скопированный venv не заработает.

```
RUN useradd --create-home --uid 1000 app
COPY --from=deps     /app/.venv     /app/.venv
COPY --from=frontend /app/dist      /app/static
COPY backend/app                    /app/app
ENV PATH=/app/.venv/bin:$PATH PYTHONUNBUFFERED=1 PORT=8000
USER app
EXPOSE 8000
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

Разбор `CMD`:

- **`sh -c`** — форма exec (`CMD ["uvicorn", ..., "--port", "$PORT"]`) не
  разворачивает переменные: uvicorn получил бы литерал `$PORT`. Значение нужно
  именно в рантайме, поэтому подстановку делает shell;
- **`exec`** — без него PID 1 остаётся за `sh`, который не пробрасывает
  `SIGTERM` дочернему процессу, и остановка контейнера упирается в таймаут;
- **`${PORT:-8000}`** — дубль `ENV PORT=8000` на случай `docker run -e PORT=`
  с пустым значением;
- **`--host 0.0.0.0`** — дефолтный `127.0.0.1` виден только изнутри контейнера.

`EXPOSE 8000` — документирующая директива для дефолтного значения; при другом
`PORT` публикация всё равно задаётся флагом `-p`.

## Правка бэкенда: раздача SPA

Новый модуль `backend/app/spa.py`:

- `SPAStaticFiles(StaticFiles)` — подкласс, который на 404 отдаёт `index.html`
  вместо ошибки. Это нужно для клиентских маршрутов (`/admin`, `/booking/<id>`):
  их нет на диске, но при прямом заходе или обновлении страницы браузер
  запрашивает именно их;
- `mount_spa(app, directory)` — монтирует каталог, если он существует.

В `create_app()` монтирование идёт **после** `include_router`. Starlette
подбирает маршруты в порядке регистрации, поэтому `/api/*`, `/docs`,
`/redoc` и `/openapi.json` попадают в таблицу раньше, чем `mount("/")`, и
монтирование их не перехватывает.

Каталог берётся из константы в `config.py`:

```python
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
```

В образе код лежит в `/app/app`, статика — в `/app/static`, константа
указывает туда. В рабочей копии `backend/static` нет, монтирования не
происходит, и локальный `uv run uvicorn` работает ровно как раньше — это
осознанное поведение, а не деградация: локально фронтенд поднимают отдельно.

`create_app(static_dir: Path | None = None)` — параметр только ради тестов, по
умолчанию берётся `config.STATIC_DIR`. Существующие вызовы `create_app()` в
`conftest.py` и `main.py` не меняются.

CORS остаётся как есть. В образе он не нужен (один origin), но `CORS_ORIGINS`
описывает локальную разработку и покрыт тестами в `test_app.py` — трогать его в
этой задаче незачем.

## Тесты

Новый `backend/tests/test_spa.py`, пишется до реализации:

| Тест | Что проверяет |
|---|---|
| `test_serves_index_for_client_route` | `GET /admin` → 200 и содержимое `index.html` |
| `test_serves_real_file` | `GET /assets/app.js` → 200 и содержимое файла |
| `test_api_wins_over_static_mount` | `GET /api/event-types` → 200 и `[]`, а не `index.html` |
| `test_openapi_still_reachable` | `GET /openapi.json` → 200 |
| `test_no_mount_without_directory` | С несуществующим каталогом приложение поднимается, `GET /admin` → 404 |

Каталог со статикой собирается в `tmp_path`: `index.html` с узнаваемым текстом и
`assets/app.js`. Реального бандла для этих тестов не нужно.

## Проверка образа

```bash
docker build -t booking-calendar .
docker run --rm -d -e PORT=8080 -p 8080:8080 --name bc booking-calendar
```

Что проверяется вручную после сборки:

1. `GET /` → HTML SPA;
2. `GET /admin` → тот же HTML (fallback работает);
3. `GET /api/event-types` → `[]`;
4. `POST /api/admin/event-types` → 201, затем `GET /api/event-types` → созданный
   тип (значит, приложение живое, а не только статика);
5. `GET /docs` → 200;
6. перезапуск с `PORT=9090` → сервис слушает 9090, на 8080 никого;
7. `docker stop` укладывается в секунду — подтверждает, что `exec` в `CMD`
   доставил `SIGTERM` до uvicorn.

Плюс полный набор проверок бэкенда из `CLAUDE.md`:
`uv run ruff check . && uv run ruff format --check . && uv run pytest`.

## .dockerignore

Исключаются каталоги, не участвующие в сборке, и всё, что портит воспроизводимость:

```
.git
node_modules
frontend/dist
frontend/.env
backend/.venv
backend/static
__pycache__
.pytest_cache
.ruff_cache
e2e
spec
docs
```

`frontend/.env` — чтобы адрес локального бэкенда не подменил `VITE_API_BASE_URL`
стадии сборки. `frontend/dist` и `backend/static` — чтобы локальные артефакты не
попадали в контекст и не притворялись свежими. `e2e`, `spec`, `docs` в рантайме
не нужны.

## Документация

Раздел «Docker» в корневом `README.md`: команды сборки и запуска, роль `PORT`,
что фронтенд собирается с `VITE_API_BASE_URL=/api`, и напоминание, что хранилище
в памяти — данные пропадают при перезапуске контейнера.

## Известные ограничения

- **Состояние в памяти.** Рестарт контейнера обнуляет типы встреч и брони.
  Горизонтальное масштабирование невозможно: у каждой реплики своё хранилище.
  Это свойство самого приложения, не образа.
- **Один воркер uvicorn.** По той же причине: несколько воркеров — несколько
  независимых хранилищ в разных процессах.
- **Фронтенд прибит к `/api` на этапе сборки.** Развернуть API на другом домене
  без пересборки образа нельзя. Для одного образа с одним origin это ровно то,
  что нужно.

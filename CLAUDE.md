# Правила репозитория для агента

Полные договорённости — в [CONTRIBUTING.md](CONTRIBUTING.md). Здесь то, что
нужно помнить в каждой сессии.

## Структура

- `spec/` — контракт API на TypeSpec, из него собирается `openapi/openapi.yaml`
  (лежит в репозитории) и Prism-мок;
- `frontend/` — React + Mantine, тесты на Vitest;
- `backend/` — FastAPI с хранилищем в памяти, тесты на pytest, линтер ruff;
- `e2e/` — Playwright, поднимает бэкенд и прод-сборку фронтенда сам;
- `docs/superpowers/` — дизайн-документы и планы по каждой задаче.

## Проверки

Перед коммитом прогоняй проверки затронутых пакетов и показывай их вывод:

```bash
cd spec     && npm run mock:check
cd frontend && npm run lint && npm test && npm run build
cd backend  && uv run ruff check . && uv run ruff format --check . && uv run pytest
cd e2e      && npm test
```

Если правишь `main.tsp` — пересобери `spec/openapi/openapi.yaml`
(`npm run build` в `spec/`) и закоммить вместе с изменением: CI сверяет их.

## Коммиты

Conventional Commits, заголовок на английском:
`<тип>(<область>): <что делает коммит>` — до 100 символов, в повелительном
наклонении, с маленькой буквы, без точки.

Разрешённые типы: `feat`, `fix`, `perf`, `refactor`, `test`, `docs`, `style`,
`build`, `ci`, `chore`, `revert`. Область — необязательная, в нижнем регистре
(`backend`, `admin`, `slots`, `e2e`, `openapi`).

Тело — маркированный список «что изменилось и почему», строки до 100 символов.
Ломающее изменение: `!` после области и футер `BREAKING CHANGE:`.

В конце каждого своего коммита оставляй трейлер:

```
Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
```

Коммить только по явной просьбе, пушить — тоже. По этим коммитам release-please
считает версию, поэтому тип выбирается по смыслу изменения, а не «на глаз».

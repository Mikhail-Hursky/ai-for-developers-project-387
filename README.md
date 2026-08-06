### Hexlet tests and linter status:
[![Actions Status](https://github.com/Mikhail-Hursky/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/Mikhail-Hursky/ai-for-developers-project-386/actions)

### CI:
[![CI](https://github.com/Mikhail-Hursky/ai-for-developers-project-386/actions/workflows/ci.yml/badge.svg)](https://github.com/Mikhail-Hursky/ai-for-developers-project-386/actions/workflows/ci.yml)

## Состав проекта

- [spec/](spec/) — контракт API на TypeSpec и Prism-мок;
- [frontend/](frontend/) — интерфейс на React + Mantine;
- [backend/](backend/) — реализация контракта на FastAPI с хранилищем в памяти;
- [e2e/](e2e/) — сквозные браузерные тесты на Playwright.

## Docker

Всё приложение целиком — один образ: FastAPI отдаёт и API, и собранный
интерфейс.

```bash
docker build -t booking-calendar .
docker run --rm -e PORT=8080 -p 8080:8080 booking-calendar
```

Порт берётся из переменной окружения `PORT`, по умолчанию `8000`. На
`http://localhost:8080/` — интерфейс, на `/api/...` — API, на `/docs` —
документация FastAPI.

Фронтенд собирается внутри образа с `VITE_API_BASE_URL=/api`: интерфейс
обращается к тому же адресу, с которого его отдали, поэтому внешний адрес API
и CORS настраивать не нужно. Файл `frontend/.env` в образ не попадает.

Хранилище бэкенда живёт в памяти процесса — типы встреч и брони пропадают при
перезапуске контейнера, и нескольких реплик у сервиса быть не может.

## Разработка

Формат коммитов, проверки перед коммитом, состав CI и порядок выпуска релизов —
в [CONTRIBUTING.md](CONTRIBUTING.md). Коротко: коммиты по
[Conventional Commits](https://www.conventionalcommits.org/ru/v1.0.0/),
на каждый пуш и pull request прогоняются линтеры и тесты всех четырёх пакетов,
версию и `CHANGELOG.md` ведёт
[release-please](https://github.com/googleapis/release-please).

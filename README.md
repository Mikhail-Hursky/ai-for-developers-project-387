### Hexlet tests and linter status:
[![Actions Status](https://github.com/Mikhail-Hursky/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/Mikhail-Hursky/ai-for-developers-project-386/actions)

### CI:
[![CI](https://github.com/Mikhail-Hursky/ai-for-developers-project-386/actions/workflows/ci.yml/badge.svg)](https://github.com/Mikhail-Hursky/ai-for-developers-project-386/actions/workflows/ci.yml)

## Состав проекта

- [spec/](spec/) — контракт API на TypeSpec и Prism-мок;
- [frontend/](frontend/) — интерфейс на React + Mantine;
- [backend/](backend/) — реализация контракта на FastAPI с хранилищем в памяти;
- [e2e/](e2e/) — сквозные браузерные тесты на Playwright.

## Разработка

Формат коммитов, проверки перед коммитом, состав CI и порядок выпуска релизов —
в [CONTRIBUTING.md](CONTRIBUTING.md). Коротко: коммиты по
[Conventional Commits](https://www.conventionalcommits.org/ru/v1.0.0/),
на каждый пуш и pull request прогоняются линтеры и тесты всех четырёх пакетов,
версию и `CHANGELOG.md` ведёт
[release-please](https://github.com/googleapis/release-please).

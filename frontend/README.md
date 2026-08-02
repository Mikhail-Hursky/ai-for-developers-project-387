# Фронтенд календаря бронирования

React-приложение главной страницы. Работает против мок-бэкенда Prism из `../spec`.

## Стек

Vite 8, React 19, TypeScript (strict), Mantine 9, React Router 7, Vitest + Testing Library.

## Запуск

Нужны два терминала: сначала мок, затем dev-сервер.

```bash
cd spec && npm install && npm run mock     # http://localhost:4010
```

```bash
cd frontend && npm install && npm run dev  # http://localhost:5173
```

Без запущенного мока главная откроется, но секция «Типы встреч» покажет ошибку
с кнопкой «Повторить».

## Адрес API

Читается из `VITE_API_BASE_URL`. Значение по умолчанию лежит в `.env`
(`http://localhost:4010`) и хранится в git — это не секрет. Личные
переопределения — в `.env.local` (в `.gitignore`).

## Команды

| Команда | Что делает |
|---|---|
| `npm run dev` | Dev-сервер Vite |
| `npm run build` | Проверка типов и продакшен-сборка в `dist/` |
| `npm run preview` | Просмотр собранной сборки |
| `npm test` | Тесты Vitest один раз |
| `npm run test:watch` | Тесты в watch-режиме |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Что реализовано

- `/` — главная: шапка, hero с CTA, типы встреч из `GET /event-types`, возможности.
- `/booking`, `/booking/:eventTypeId` — заглушка «Скоро».
- `/admin` — заглушка «Скоро».

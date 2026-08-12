# Booking Calendar API — спецификация

TypeSpec-описание HTTP API календаря бронирования: только те ручки бэкенда,
которые дёргает фронтенд.

## Структура

- [main.tsp](main.tsp) — исходная спецификация (модели, ручки, ошибки);
- [openapi/openapi.yaml](openapi/openapi.yaml) — сгенерированный OpenAPI 3.0
  (можно открыть в Swagger UI / Redoc или скормить кодогенератору).

## Ручки

| Роль | Метод и путь | Назначение |
|---|---|---|
| Гость | `GET /event-types` | Витрина видов брони (название, описание, длительность) |
| Гость | `GET /event-types/{eventTypeId}` | Один тип события для страницы бронирования |
| Гость | `GET /event-types/{eventTypeId}/slots` | Свободные слоты на 14 дней от текущей даты |
| Гость | `POST /bookings` | Создать бронь (201; 404/409/422 при ошибках) |
| Владелец | `POST /admin/event-types` | Создать тип события (id задаёт владелец) |
| Владелец | `GET /admin/bookings/upcoming` | Единый список предстоящих встреч всех типов |

Ключевые правила контракта:

- **Занятость**: на одно и то же время нельзя создать две брони, даже разных
  типов событий — при пересечении по времени `POST /bookings` возвращает
  `409 slot_already_booked`, и фронту следует перезапросить слоты.
- **Окно записи**: слоты формируются на 14 дней, начиная с текущей даты;
  время вне окна / вне сетки слотов / в прошлом — `422 validation_failed`.
- Регистрации и авторизации нет: админские ручки просто живут под `/admin`.

## Сборка

```bash
npm install
npm run build   # tsp compile . → openapi/openapi.yaml
```

## Мок-сервер

Мок бэкенда поднимается [Prism](https://stoplight.io/open-source/prism) прямо
из спецификации — фронтенд может разрабатываться до появления реального сервера.

```bash
npm run mock         # http://localhost:4010
npm run mock:check   # smoke-проверка всех ручек
```

`npm run mock` компилирует TypeSpec, собирает `openapi/openapi.mock.yaml`
(контракт + примеры ответов, файл не хранится в git) и запускает Prism.

Пути — как в спецификации, **без префикса `/api`**: `GET http://localhost:4010/event-types`.

### Данные мока

- три типа события: `intro-call` (30 мин), `design-review` (60), `coffee-chat` (15);
- слоты — окно на 14 дней от текущей даты: будни 10:00–18:00 UTC, выходные пустые,
  часть слотов занята. Даты считаются в момент запуска, так что окно всегда в будущем;
- предстоящие встречи — три брони разных типов в разные дни.

### Выбор ответа

Мок stateless: созданная бронь не появится в списке предстоящих, а 409 сам собой
не возникнет. Нужный ответ выбирается заголовком `Prefer`:

```bash
curl -H 'Prefer: code=409' -X POST http://localhost:4010/bookings -d '...'   # slot_already_booked
curl -H 'Prefer: code=404' http://localhost:4010/event-types/unknown         # not_found
curl -H 'Prefer: example=design-review' http://localhost:4010/event-types/design-review/slots
```

Запросы валидируются по спецификации: невалидное тело `POST /bookings` вернёт
`422 validation_failed` без всякого `Prefer`.

### Правка моковых данных

Данные лежат в [scripts/mock-fixtures.mjs](scripts/mock-fixtures.mjs), раскладка
по ручкам — в [scripts/build-mock-spec.mjs](scripts/build-mock-spec.mjs).
`main.tsp` при этом не меняется: контракт и dev-данные живут отдельно.

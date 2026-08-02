# Страница записи — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать поток записи гостя: выбор типа встречи на `/booking`, выбор дня и свободного слота на `/booking/:eventTypeId`, форма контактов, подтверждение по ответу `POST /bookings`.

**Architecture:** Три почти одинаковых хука загрузки заменяются одним `useApiResource`; запросы уезжают в `endpoints.ts`, где в одном месте живёт заголовок `Prefer` для Prism. Страница записи — тонкий читатель параметра маршрута над компонентом `BookingFlow`, который держит состояние выбора и отправки; дни, слоты, форма и подтверждение — отдельные презентационные компоненты. Форматирование дат вынесено в чистые функции на `Intl`.

**Tech Stack:** React 19, TypeScript strict, Mantine 9 (`@mantine/core`, `@mantine/form`), React Router 7, Vitest 4 + Testing Library.

## Global Constraints

- Работаем только в каталоге `frontend/`. Каталог `spec/` и `.github/` не трогаем.
- Новая зависимость ровно одна: `@mantine/form@^9.5.1`. `@mantine/dates` не подключаем.
- TypeScript strict как в проекте: `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, никаких `any` и `@ts-ignore`.
- Vitest без `globals`: `describe`/`it`/`expect`/`vi` импортируются явно из `vitest`.
- Импорты React Router — из пакета `react-router`.
- Правило линтера `react-hooks/set-state-in-effect` включено: синхронный `setState` в теле `useEffect` запрещён. Сбрасывать состояние — в обработчиках, не в эффектах.
- Весь пользовательский текст — на русском, ровно теми формулировками, что указаны в шагах.
- Локаль форматирования — `ru-RU`. Время показывается в часовом поясе браузера; в `POST /bookings` уходит строка `startAt` из ответа API без пересборки.
- Заголовок `Prefer: example=<eventTypeId>` шлётся на `GET /event-types/{id}` и `GET /event-types/{id}/slots` — без него Prism отдаёт слоты `intro-call` для любого типа.
- Проверка email во фронте — `/^\S+@\S+\.\S+$/`, глубокая проверка остаётся серверу.
- Коммиты — на английском, в формате Conventional Commits, после каждой задачи.
- Все команды запускаются из каталога `frontend/`.

## Файловая структура

| Файл | Ответственность |
|---|---|
| `src/shared/format/datetime.ts` | Форматирование дат и времени на `Intl` |
| `src/shared/format/plural.ts` | Согласование числа со словом «слот» |
| `src/shared/api/client.ts` | + `apiPost`, общая функция `request` |
| `src/shared/api/types.ts` | + `CreateBookingRequest` |
| `src/shared/api/endpoints.ts` | Четыре функции запросов, заголовок `Prefer` |
| `src/shared/api/useApiResource.ts` | Общий хук загрузки: данные, загрузка, ошибка, повтор |
| `src/shared/api/useEventTypes.ts` | Обёртка над `useApiResource` |
| `src/shared/api/useBookingData.ts` | Тип события + слоты одним состоянием |
| `src/shared/ui/EventTypeCard.tsx` | Карточка типа встречи со ссылкой на запись |
| `src/shared/ui/EventTypeList.tsx` | Четыре состояния списка типов + сетка карточек |
| `src/features/home/EventTypes.tsx` | Секция главной: заголовок + `EventTypeList` |
| `src/pages/BookingIndexPage.tsx` | `/booking`: выбор типа встречи |
| `src/pages/BookingPage.tsx` | `/booking/:eventTypeId`: читает параметр, монтирует `BookingFlow` |
| `src/features/booking/BookingFlow.tsx` | Состояние выбора и отправки, состояния загрузки и ошибок |
| `src/features/booking/DayList.tsx` | Список 14 дней окна записи |
| `src/features/booking/SlotGrid.tsx` | Сетка слотов выбранного дня |
| `src/features/booking/GuestForm.tsx` | Форма гостя на `@mantine/form` |
| `src/features/booking/BookingSuccess.tsx` | Подтверждение по ответу сервера |
| `src/test/fixtures.ts` | Фикстуры типов события и слотов для тестов |
| `src/test/stubFetch.ts` | Подмена `fetch` с маршрутизацией по URL |

Уточнение против спеки: `BookingPage.tsx` оказался тонким читателем параметра
маршрута, а состояние потока переехало в `features/booking/BookingFlow.tsx`.
Так `BookingFlow` монтируется заново через `key={eventTypeId}` при смене типа
встречи и не тащит чужое состояние. Ещё добавились `shared/ui/EventTypeList.tsx`
(четыре состояния списка нужны и главной, и `/booking`), `shared/format/plural.ts`
и два файла тестовых хелперов.

---

### Task 1: Форматирование дат и времени

**Files:**
- Create: `frontend/src/shared/format/datetime.ts`, `frontend/src/shared/format/plural.ts`
- Modify: `frontend/vite.config.ts`
- Test: `frontend/src/shared/format/datetime.test.ts`, `frontend/src/shared/format/plural.test.ts`

**Interfaces:**
- Consumes: ничего.
- Produces:
  - `currentTimeZone(): string`
  - `formatDayLabel(isoDate: string): string`
  - `formatTime(isoDateTime: string, timeZone?: string): string`
  - `formatTimeRange(startAt: string, endAt: string, timeZone?: string): string`
  - `formatDateTimeLong(isoDateTime: string, timeZone?: string): string`
  - `formatSlotCount(count: number): string`

- [ ] **Step 1: Зафиксировать часовой пояс тестов**

`frontend/vite.config.ts` — заменить содержимое целиком:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Тесты форматируют даты через Intl, поэтому часовой пояс фиксируется:
// иначе результат зависел бы от машины, на которой они запущены.
process.env.TZ = 'UTC';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    env: { TZ: 'UTC' },
    css: false,
    restoreMocks: true,
  },
});
```

- [ ] **Step 2: Написать падающие тесты форматирования**

`frontend/src/shared/format/datetime.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  currentTimeZone,
  formatDateTimeLong,
  formatDayLabel,
  formatTime,
  formatTimeRange,
} from './datetime';

describe('formatDayLabel', () => {
  it('показывает день недели, число и месяц', () => {
    expect(formatDayLabel('2026-08-05')).toBe('ср, 5 авг.');
  });

  it('трактует дату как календарную и не сдвигает её часовым поясом', () => {
    expect(formatDayLabel('2026-01-01')).toBe('чт, 1 янв.');
  });
});

describe('formatTime', () => {
  it('форматирует время в указанном часовом поясе', () => {
    expect(formatTime('2026-08-05T11:00:00Z', 'UTC')).toBe('11:00');
    expect(formatTime('2026-08-05T11:00:00Z', 'Europe/Minsk')).toBe('14:00');
  });

  it('по умолчанию использует часовой пояс окружения', () => {
    expect(formatTime('2026-08-05T11:00:00Z')).toBe('11:00');
    expect(currentTimeZone()).toBe('UTC');
  });
});

describe('formatTimeRange', () => {
  it('соединяет начало и конец тире', () => {
    expect(formatTimeRange('2026-08-05T11:00:00Z', '2026-08-05T11:30:00Z', 'UTC')).toBe(
      '11:00 – 11:30',
    );
  });
});

describe('formatDateTimeLong', () => {
  it('пишет дату словами и время', () => {
    expect(formatDateTimeLong('2026-08-05T11:00:00Z', 'UTC')).toBe(
      'среда, 5 августа 2026 г. в 11:00',
    );
  });
});
```

`frontend/src/shared/format/plural.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { formatSlotCount } from './plural';

describe('formatSlotCount', () => {
  it('согласует слово «слот» с числом', () => {
    expect(formatSlotCount(1)).toBe('1 слот');
    expect(formatSlotCount(2)).toBe('2 слота');
    expect(formatSlotCount(4)).toBe('4 слота');
    expect(formatSlotCount(5)).toBe('5 слотов');
    expect(formatSlotCount(11)).toBe('11 слотов');
    expect(formatSlotCount(21)).toBe('21 слот');
  });
});
```

- [ ] **Step 3: Убедиться, что тесты падают**

Run: `cd frontend && npx vitest run src/shared/format`
Expected: FAIL — `Failed to resolve import "./datetime"`.

- [ ] **Step 4: Реализовать форматирование**

`frontend/src/shared/format/datetime.ts`:

```ts
const LOCALE = 'ru-RU';

/** Часовой пояс окружения — его же показываем гостю в подписи под слотами. */
export function currentTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * `2026-08-05` → `ср, 5 авг.`
 * Календарная дата форматируется в UTC: это день из окна записи, а не момент
 * времени, и сдвигать его часовым поясом нельзя.
 */
export function formatDayLabel(isoDate: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

/** `2026-08-05T11:00:00Z` → `11:00` в указанном (по умолчанию местном) поясе. */
export function formatTime(isoDateTime: string, timeZone: string = currentTimeZone()): string {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(isoDateTime));
}

/** `11:00 – 11:30` */
export function formatTimeRange(
  startAt: string,
  endAt: string,
  timeZone: string = currentTimeZone(),
): string {
  return `${formatTime(startAt, timeZone)} – ${formatTime(endAt, timeZone)}`;
}

/** `среда, 5 августа 2026 г. в 11:00` */
export function formatDateTimeLong(
  isoDateTime: string,
  timeZone: string = currentTimeZone(),
): string {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(isoDateTime));
}
```

`frontend/src/shared/format/plural.ts`:

```ts
const RULES = new Intl.PluralRules('ru-RU');

const SLOT_FORMS: Record<Intl.LDMLPluralRule, string> = {
  zero: 'слотов',
  one: 'слот',
  two: 'слота',
  few: 'слота',
  many: 'слотов',
  other: 'слотов',
};

/** `4` → `4 слота` */
export function formatSlotCount(count: number): string {
  return `${count} ${SLOT_FORMS[RULES.select(count)]}`;
}
```

- [ ] **Step 5: Проверить, что тесты проходят**

Run: `cd frontend && npx vitest run src/shared/format`
Expected: 7 тестов PASS.

- [ ] **Step 6: Прогнать весь набор, типы и линтер**

Run: `cd frontend && npm test && npm run typecheck && npm run lint`
Expected: все тесты PASS, ошибок нет.

- [ ] **Step 7: Коммит**

```bash
git add frontend/src/shared/format frontend/vite.config.ts
git commit -m "feat(frontend): add date and plural formatting helpers"
```

---

### Task 2: Слой API для записи

**Files:**
- Modify: `frontend/src/shared/api/client.ts` (целиком), `frontend/src/shared/api/types.ts` (добавить `CreateBookingRequest`), `frontend/src/shared/api/useEventTypes.ts` (целиком)
- Create: `frontend/src/shared/api/endpoints.ts`, `frontend/src/shared/api/useApiResource.ts`, `frontend/src/shared/api/useBookingData.ts`
- Test: `frontend/src/shared/api/client.test.ts` (дополнить), `frontend/src/shared/api/endpoints.test.ts`

**Interfaces:**
- Consumes: `ApiError`, `EventType`, `Availability`, `Booking`, `FieldError` из `types.ts`; `apiBaseUrl` из `client.ts`.
- Produces:
  - `interface CreateBookingRequest { eventTypeId: string; startAt: string; guestName: string; guestEmail: string; comment?: string }`
  - `apiPost<T>(path: string, body: unknown, init?: RequestInit): Promise<T>`
  - `fetchEventTypes(signal: AbortSignal): Promise<EventType[]>`
  - `fetchEventType(eventTypeId: string, signal: AbortSignal): Promise<EventType>`
  - `fetchAvailability(eventTypeId: string, signal: AbortSignal): Promise<Availability>`
  - `createBooking(request: CreateBookingRequest, signal?: AbortSignal): Promise<Booking>`
  - `interface ApiResource<T> { data: T | null; isLoading: boolean; error: ApiError | null; retry: () => void }`
  - `useApiResource<T>(loader: (signal: AbortSignal) => Promise<T>): ApiResource<T>`
  - `useEventTypes(): ApiResource<EventType[]>`
  - `interface BookingData { eventType: EventType; availability: Availability }`
  - `useBookingData(eventTypeId: string): ApiResource<BookingData>`

- [ ] **Step 1: Поставить `@mantine/form`**

```bash
cd frontend && npm i @mantine/form@^9.5.1
```

Зависимость понадобится в задаче 5, но ставим сразу, чтобы `npm install` не
повторялся посреди работы.

- [ ] **Step 2: Написать падающие тесты `apiPost` и `endpoints`**

Дополнить `frontend/src/shared/api/client.test.ts` — добавить в конец файла:

```ts
describe('apiPost', () => {
  it('шлёт POST с JSON-телом', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      Response.json({ id: 'created' }, { status: 201 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiPost<{ id: string }>('/bookings', { eventTypeId: 'intro-call' });

    const init = fetchMock.mock.calls[0]?.[1];
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${apiBaseUrl}/bookings`);
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({ eventTypeId: 'intro-call' }));
    expect(result).toEqual({ id: 'created' });
  });

  it('кладёт ошибки полей из 422 в fieldErrors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          {
            code: 'validation_failed',
            message: 'Запрос не прошёл валидацию.',
            errors: [{ field: 'guestEmail', message: 'Укажите корректный email.' }],
          },
          { status: 422 },
        ),
      ),
    );

    const error = await apiPost('/bookings', {}).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).fieldErrors).toEqual([
      { field: 'guestEmail', message: 'Укажите корректный email.' },
    ]);
  });
});
```

И поправить первую строку импорта этого файла на:

```ts
import { apiBaseUrl, apiGet, apiPost } from './client';
```

`frontend/src/shared/api/endpoints.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiBaseUrl } from './client';
import { createBooking, fetchAvailability, fetchEventType, fetchEventTypes } from './endpoints';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stub() {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
    Response.json({}),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function headerOf(init: RequestInit | undefined, name: string): string | null {
  return new Headers(init?.headers).get(name);
}

describe('endpoints', () => {
  it('запрашивает список типов без заголовка Prefer', async () => {
    const fetchMock = stub();

    await fetchEventTypes(new AbortController().signal);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${apiBaseUrl}/event-types`);
    expect(headerOf(fetchMock.mock.calls[0]?.[1], 'Prefer')).toBeNull();
  });

  it('выбирает пример мока по идентификатору типа события', async () => {
    const fetchMock = stub();

    await fetchEventType('design-review', new AbortController().signal);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${apiBaseUrl}/event-types/design-review`);
    expect(headerOf(fetchMock.mock.calls[0]?.[1], 'Prefer')).toBe('example=design-review');
  });

  it('запрашивает слоты с тем же заголовком', async () => {
    const fetchMock = stub();

    await fetchAvailability('coffee-chat', new AbortController().signal);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${apiBaseUrl}/event-types/coffee-chat/slots`);
    expect(headerOf(fetchMock.mock.calls[0]?.[1], 'Prefer')).toBe('example=coffee-chat');
  });

  it('создаёт бронь методом POST', async () => {
    const fetchMock = stub();

    await createBooking({
      eventTypeId: 'intro-call',
      startAt: '2026-08-05T11:00:00Z',
      guestName: 'Анна',
      guestEmail: 'anna@example.com',
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${apiBaseUrl}/bookings`);
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST');
  });
});
```

- [ ] **Step 3: Убедиться, что тесты падают**

Run: `cd frontend && npx vitest run src/shared/api`
Expected: FAIL — `apiPost` не экспортирован, `./endpoints` не найден.

- [ ] **Step 4: Переписать `client.ts`**

`frontend/src/shared/api/client.ts` — заменить содержимое целиком:

```ts
import { ApiError, type ApiErrorCode, type FieldError } from './types';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!rawBaseUrl) {
  throw new Error(
    'VITE_API_BASE_URL не задан. Укажите адрес мок-сервера в frontend/.env, например http://localhost:4010',
  );
}

export const apiBaseUrl = rawBaseUrl.replace(/\/+$/, '');

interface ErrorBody {
  code?: ApiErrorCode;
  message?: string;
  errors?: FieldError[];
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, init);
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause;
    }
    throw new ApiError('network_error', 'Не удалось связаться с сервером', 0);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ErrorBody | null;
    throw new ApiError(
      body?.code ?? 'unknown_error',
      body?.message ?? `Сервер ответил кодом ${response.status}`,
      response.status,
      body?.errors,
    );
  }

  return (await response.json()) as T;
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  });
}

export async function apiPost<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  return request<T>(path, {
    ...init,
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    body: JSON.stringify(body),
  });
}
```

- [ ] **Step 5: Добавить тип запроса брони**

`frontend/src/shared/api/types.ts` — вставить после интерфейса `Booking`:

```ts
export interface CreateBookingRequest {
  eventTypeId: string;
  startAt: string;
  guestName: string;
  guestEmail: string;
  comment?: string;
}
```

- [ ] **Step 6: Написать `endpoints.ts`**

`frontend/src/shared/api/endpoints.ts`:

```ts
import { apiGet, apiPost } from './client';
import type { Availability, Booking, CreateBookingRequest, EventType } from './types';

/**
 * Prism выбирает пример ответа заголовком `Prefer`. Примеры ручек по id названы
 * идентификатором типа события: без заголовка мок отдал бы первый пример —
 * слоты `intro-call` — для любого типа. Настоящий бэкенд заголовок игнорирует.
 */
function preferExample(eventTypeId: string): HeadersInit {
  return { Prefer: `example=${eventTypeId}` };
}

export function fetchEventTypes(signal: AbortSignal): Promise<EventType[]> {
  return apiGet<EventType[]>('/event-types', { signal });
}

export function fetchEventType(eventTypeId: string, signal: AbortSignal): Promise<EventType> {
  return apiGet<EventType>(`/event-types/${encodeURIComponent(eventTypeId)}`, {
    signal,
    headers: preferExample(eventTypeId),
  });
}

export function fetchAvailability(eventTypeId: string, signal: AbortSignal): Promise<Availability> {
  return apiGet<Availability>(`/event-types/${encodeURIComponent(eventTypeId)}/slots`, {
    signal,
    headers: preferExample(eventTypeId),
  });
}

export function createBooking(
  request: CreateBookingRequest,
  signal?: AbortSignal,
): Promise<Booking> {
  return apiPost<Booking>('/bookings', request, { signal });
}
```

- [ ] **Step 7: Написать `useApiResource.ts`**

`frontend/src/shared/api/useApiResource.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';

import { ApiError } from './types';

export interface ApiResource<T> {
  data: T | null;
  isLoading: boolean;
  error: ApiError | null;
  retry: () => void;
}

/**
 * Загрузка одного ресурса: запрос на монтировании, отмена на размонтировании,
 * повтор по `retry`. `loader` должен быть стабильным (обычно `useCallback`):
 * его смена перезапускает запрос.
 */
export function useApiResource<T>(loader: (signal: AbortSignal) => Promise<T>): ApiResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    loader(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }
        setData(result);
        setIsLoading(false);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setData(null);
        setError(
          cause instanceof ApiError ? cause : new ApiError('unknown_error', 'Неизвестная ошибка', 0),
        );
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [loader, attempt]);

  // Состояние сбрасывается здесь, а не в эффекте: синхронный setState внутри
  // эффекта запрещён правилом react-hooks/set-state-in-effect.
  const retry = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(true);
    setAttempt((current) => current + 1);
  }, []);

  return { data, isLoading, error, retry };
}
```

- [ ] **Step 8: Переписать `useEventTypes.ts` и добавить `useBookingData.ts`**

`frontend/src/shared/api/useEventTypes.ts` — заменить содержимое целиком:

```ts
import { useCallback } from 'react';

import { fetchEventTypes } from './endpoints';
import type { EventType } from './types';
import { useApiResource, type ApiResource } from './useApiResource';

export function useEventTypes(): ApiResource<EventType[]> {
  const loader = useCallback((signal: AbortSignal) => fetchEventTypes(signal), []);

  return useApiResource(loader);
}
```

`frontend/src/shared/api/useBookingData.ts`:

```ts
import { useCallback } from 'react';

import { fetchAvailability, fetchEventType } from './endpoints';
import type { Availability, EventType } from './types';
import { useApiResource, type ApiResource } from './useApiResource';

export interface BookingData {
  eventType: EventType;
  availability: Availability;
}

/** Тип события и его слоты одним состоянием: один спиннер и один алерт ошибки. */
export function useBookingData(eventTypeId: string): ApiResource<BookingData> {
  const loader = useCallback(
    async (signal: AbortSignal): Promise<BookingData> => {
      const [eventType, availability] = await Promise.all([
        fetchEventType(eventTypeId, signal),
        fetchAvailability(eventTypeId, signal),
      ]);

      return { eventType, availability };
    },
    [eventTypeId],
  );

  return useApiResource(loader);
}
```

- [ ] **Step 9: Прогнать всё**

Run: `cd frontend && npm test && npm run typecheck && npm run lint`
Expected: все тесты PASS, включая существующие `useEventTypes.test.ts` и тесты главной.

- [ ] **Step 10: Коммит**

```bash
git add frontend/src/shared/api frontend/package.json frontend/package-lock.json
git commit -m "feat(frontend): add booking endpoints and shared resource hook"
```

---

### Task 3: Карточка типа встречи и страница `/booking`

**Files:**
- Create: `frontend/src/shared/ui/EventTypeCard.tsx`, `frontend/src/shared/ui/EventTypeList.tsx`, `frontend/src/pages/BookingIndexPage.tsx`
- Modify: `frontend/src/features/home/EventTypes.tsx` (целиком), `frontend/src/App.tsx` (маршрут `/booking`)
- Test: `frontend/src/pages/BookingIndexPage.test.tsx`

**Interfaces:**
- Consumes: `useEventTypes(): ApiResource<EventType[]>`, `ApiResource<T>` из задачи 2.
- Produces: `EventTypeCard({ eventType }: { eventType: EventType })`, `EventTypeList({ resource }: { resource: ApiResource<EventType[]> })`, `BookingIndexPage()`.

- [ ] **Step 1: Написать падающий тест страницы**

`frontend/src/pages/BookingIndexPage.test.tsx`:

```tsx
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderApp } from '../test/renderApp';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BookingIndexPage', () => {
  it('показывает карточки типов встреч со ссылками на запись', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json([
          {
            id: 'intro-call',
            name: 'Знакомство',
            description: 'Короткий созвон.',
            durationMinutes: 30,
          },
        ]),
      ),
    );

    renderApp('/booking');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Записаться на встречу');
    expect(await screen.findByRole('link', { name: /Знакомство/ })).toHaveAttribute(
      'href',
      '/booking/intro-call',
    );
  });

  it('показывает алерт, если список не загрузился', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ code: 'unknown_error', message: 'Сбой' }, { status: 500 })),
    );

    renderApp('/booking');

    expect(await screen.findByText(/Не удалось загрузить типы встреч/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `cd frontend && npx vitest run src/pages/BookingIndexPage.test.tsx`
Expected: FAIL — заголовок `Записаться на встречу` не найден, рендерится заглушка «Бронирование».

- [ ] **Step 3: Вынести карточку типа встречи**

`frontend/src/shared/ui/EventTypeCard.tsx`:

```tsx
import { Badge, Card, Group, Text, Title } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { Link } from 'react-router';

import type { EventType } from '../api/types';

export function EventTypeCard({ eventType }: { eventType: EventType }) {
  return (
    <Card component={Link} to={`/booking/${eventType.id}`} padding="lg" radius="lg" withBorder>
      <Group justify="space-between" mb="xs" wrap="nowrap">
        <Title order={3} fz="lg">
          {eventType.name}
        </Title>
        <Badge variant="light" radius="sm">
          {eventType.durationMinutes} мин
        </Badge>
      </Group>

      <Text c="dimmed" fz="sm" mb="md" lineClamp={3}>
        {eventType.description}
      </Text>

      <Group gap={6} c="brand.7" fz="sm" fw={500} mt="auto">
        Записаться
        <IconArrowRight size={16} stroke={1.8} />
      </Group>
    </Card>
  );
}
```

- [ ] **Step 4: Вынести четыре состояния списка**

`frontend/src/shared/ui/EventTypeList.tsx`:

```tsx
import { Alert, Button, SimpleGrid, Skeleton, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

import type { EventType } from '../api/types';
import type { ApiResource } from '../api/useApiResource';
import { EventTypeCard } from './EventTypeCard';

export function EventTypeList({ resource }: { resource: ApiResource<EventType[]> }) {
  const { data, isLoading, error, retry } = resource;

  if (isLoading) {
    return (
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
        <Skeleton height={168} radius="lg" />
        <Skeleton height={168} radius="lg" />
        <Skeleton height={168} radius="lg" />
      </SimpleGrid>
    );
  }

  if (error) {
    return (
      <Alert
        color="red"
        variant="light"
        radius="md"
        icon={<IconAlertTriangle size={20} />}
        title="Ошибка загрузки"
      >
        <Stack gap="sm" align="flex-start">
          <Text fz="sm">Не удалось загрузить типы встреч. Проверьте, запущен ли мок-сервер.</Text>
          <Button size="xs" variant="light" color="red" onClick={retry}>
            Повторить
          </Button>
        </Stack>
      </Alert>
    );
  }

  if (!data || data.length === 0) {
    return <Text c="dimmed">Типы встреч пока не созданы.</Text>;
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
      {data.map((eventType) => (
        <EventTypeCard key={eventType.id} eventType={eventType} />
      ))}
    </SimpleGrid>
  );
}
```

- [ ] **Step 5: Упростить секцию главной**

`frontend/src/features/home/EventTypes.tsx` — заменить содержимое целиком:

```tsx
import { Container, Stack, Text, Title } from '@mantine/core';

import { useEventTypes } from '../../shared/api/useEventTypes';
import { EventTypeList } from '../../shared/ui/EventTypeList';

export function EventTypes() {
  const resource = useEventTypes();

  return (
    <Container size="lg" component="section" aria-label="Типы встреч" py={{ base: 32, md: 64 }}>
      <Stack gap="xs" mb="xl">
        <Title order={2}>Типы встреч</Title>
        <Text c="dimmed">Выберите формат — дальше останется указать время.</Text>
      </Stack>

      <EventTypeList resource={resource} />
    </Container>
  );
}
```

- [ ] **Step 6: Написать страницу `/booking`**

`frontend/src/pages/BookingIndexPage.tsx`:

```tsx
import { Container, Stack, Text, Title } from '@mantine/core';

import { useEventTypes } from '../shared/api/useEventTypes';
import { EventTypeList } from '../shared/ui/EventTypeList';

export function BookingIndexPage() {
  const resource = useEventTypes();

  return (
    <Container size="lg" py={{ base: 32, md: 64 }}>
      <Stack gap="xs" mb="xl">
        <Title order={1}>Записаться на встречу</Title>
        <Text c="dimmed">Выберите тип встречи — дальше выберете день и время.</Text>
      </Stack>

      <EventTypeList resource={resource} />
    </Container>
  );
}
```

- [ ] **Step 7: Подключить маршрут**

`frontend/src/App.tsx` — заменить содержимое целиком:

```tsx
import { Navigate, Route, Routes } from 'react-router';

import { RootLayout } from './layout/RootLayout';
import { AdminPage } from './pages/AdminPage';
import { BookingIndexPage } from './pages/BookingIndexPage';
import { BookingPage } from './pages/BookingPage';
import { HomePage } from './pages/HomePage';

export function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="booking" element={<BookingIndexPage />} />
        <Route path="booking/:eventTypeId" element={<BookingPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 8: Прогнать существующие тесты**

Тесты шапки, главной и навигации менять не нужно: они не полагаются на
содержимое `/booking`, а `fetch` в них уже подменён на пустой список типов.
Убедиться, что они по-прежнему зелёные.

Run: `cd frontend && npm test`
Expected: все тесты PASS.

- [ ] **Step 9: Прогнать типы и линтер**

Run: `cd frontend && npm run typecheck && npm run lint`
Expected: ошибок нет.

- [ ] **Step 10: Коммит**

```bash
git add frontend/src
git commit -m "feat(frontend): add event type picker page at /booking"
```

---

### Task 4: Дни и слоты на `/booking/:eventTypeId`

**Files:**
- Create: `frontend/src/features/booking/DayList.tsx`, `frontend/src/features/booking/SlotGrid.tsx`, `frontend/src/features/booking/BookingFlow.tsx`, `frontend/src/test/fixtures.ts`, `frontend/src/test/stubFetch.ts`
- Modify: `frontend/src/pages/BookingPage.tsx` (целиком)
- Test: `frontend/src/features/booking/BookingFlow.test.tsx`

**Interfaces:**
- Consumes: `useBookingData(eventTypeId): ApiResource<BookingData>`, `formatDayLabel`, `formatTime`, `formatTimeRange`, `currentTimeZone`, `formatSlotCount`.
- Produces:
  - `DayList({ days, selectedDate, onSelect }: { days: DayAvailability[]; selectedDate: string | null; onSelect: (date: string) => void })`
  - `SlotGrid({ slots, selectedStartAt, onSelect }: { slots: Slot[]; selectedStartAt: string | null; onSelect: (slot: Slot) => void })`
  - `BookingFlow({ eventTypeId }: { eventTypeId: string })`
  - `INTRO_CALL: EventType`, `availabilityFixture(): Availability`, `bookingFixture(): Booking` из `src/test/fixtures.ts`
  - `stubFetch(routes: FetchRoutes): Mock` из `src/test/stubFetch.ts`

- [ ] **Step 1: Написать тестовые фикстуры и подмену fetch**

`frontend/src/test/fixtures.ts`:

```ts
import type { Availability, Booking, EventType } from '../shared/api/types';

export const INTRO_CALL: EventType = {
  id: 'intro-call',
  name: 'Знакомство',
  description: 'Короткий созвон, чтобы обсудить задачу.',
  durationMinutes: 30,
};

/** Два дня со слотами и один без — хватает, чтобы проверить переключение дней. */
export function availabilityFixture(): Availability {
  return {
    eventTypeId: INTRO_CALL.id,
    slotDurationMinutes: 30,
    windowStartDate: '2026-08-05',
    windowEndDate: '2026-08-07',
    days: [
      {
        date: '2026-08-05',
        slots: [
          { startAt: '2026-08-05T11:00:00Z', endAt: '2026-08-05T11:30:00Z' },
          { startAt: '2026-08-05T12:00:00Z', endAt: '2026-08-05T12:30:00Z' },
        ],
      },
      {
        date: '2026-08-06',
        slots: [{ startAt: '2026-08-06T15:00:00Z', endAt: '2026-08-06T15:30:00Z' }],
      },
      { date: '2026-08-07', slots: [] },
    ],
  };
}

export function bookingFixture(): Booking {
  return {
    id: '4f3a1c6e-59f1-4a0a-9d1f-4f6b0d2c1a01',
    eventType: INTRO_CALL,
    startAt: '2026-08-05T11:00:00Z',
    endAt: '2026-08-05T11:30:00Z',
    guestName: 'Анна Петрова',
    guestEmail: 'anna.petrova@example.com',
    comment: 'Хочу обсудить редизайн лендинга.',
    createdAt: '2026-08-02T09:00:00Z',
  };
}
```

`frontend/src/test/stubFetch.ts`:

```ts
import { vi } from 'vitest';

export interface FetchRoutes {
  /** `GET /event-types/{id}` */
  eventType?: () => Response;
  /** `GET /event-types/{id}/slots` */
  slots?: () => Response;
  /** `POST /bookings` */
  booking?: () => Response;
  /** `GET /event-types` */
  eventTypes?: () => Response;
}

/**
 * Подменяет `fetch` и раздаёт ответы по URL. Проверка `/slots` идёт первой:
 * путь слотов содержит в себе путь типа события.
 */
export function stubFetch(routes: FetchRoutes) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = String(input);

    if (url.endsWith('/slots') && routes.slots) {
      return routes.slots();
    }
    if (url.endsWith('/bookings') && routes.booking) {
      return routes.booking();
    }
    if (url.endsWith('/event-types') && routes.eventTypes) {
      return routes.eventTypes();
    }
    if (url.includes('/event-types/') && routes.eventType) {
      return routes.eventType();
    }

    throw new Error(`Тестовый fetch не знает, что ответить на ${url}`);
  });

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

/** Количество запросов к слотам — для проверок перезапроса. */
export function slotsRequestCount(fetchMock: { mock: { calls: unknown[][] } }): number {
  return fetchMock.mock.calls.filter((call) => String(call[0]).endsWith('/slots')).length;
}
```

- [ ] **Step 2: Написать падающие тесты экрана**

`frontend/src/features/booking/BookingFlow.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { availabilityFixture, INTRO_CALL } from '../../test/fixtures';
import { renderApp } from '../../test/renderApp';
import { stubFetch } from '../../test/stubFetch';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BookingFlow', () => {
  it('показывает тип встречи, дни окна и слоты первого свободного дня', async () => {
    stubFetch({
      eventType: () => Response.json(INTRO_CALL),
      slots: () => Response.json(availabilityFixture()),
    });

    renderApp('/booking/intro-call');

    expect(await screen.findByRole('heading', { level: 1, name: 'Знакомство' })).toBeInTheDocument();
    expect(screen.getByText('30 мин')).toBeInTheDocument();

    const days = screen.getByRole('group', { name: 'Дни окна записи' });
    expect(within(days).getByRole('button', { name: /5 авг/ })).toBeInTheDocument();
    expect(within(days).getByRole('button', { name: /7 авг.*нет слотов/ })).toBeDisabled();

    const slots = screen.getByRole('group', { name: 'Свободные слоты' });
    expect(within(slots).getByRole('button', { name: '11:00' })).toBeInTheDocument();
    expect(within(slots).getByRole('button', { name: '12:00' })).toBeInTheDocument();
  });

  it('по клику на другой день показывает слоты этого дня', async () => {
    const user = userEvent.setup();
    stubFetch({
      eventType: () => Response.json(INTRO_CALL),
      slots: () => Response.json(availabilityFixture()),
    });

    renderApp('/booking/intro-call');

    const days = await screen.findByRole('group', { name: 'Дни окна записи' });
    await user.click(within(days).getByRole('button', { name: /6 авг/ }));

    const slots = screen.getByRole('group', { name: 'Свободные слоты' });
    expect(within(slots).getByRole('button', { name: '15:00' })).toBeInTheDocument();
    expect(within(slots).queryByRole('button', { name: '11:00' })).not.toBeInTheDocument();
  });

  it('на неизвестный тип встречи показывает 404-страницу', async () => {
    stubFetch({
      eventType: () =>
        Response.json({ code: 'not_found', message: 'Тип события не найден.' }, { status: 404 }),
      slots: () =>
        Response.json({ code: 'not_found', message: 'Тип события не найден.' }, { status: 404 }),
    });

    renderApp('/booking/nope');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Тип встречи не найден' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Выбрать тип встречи' })).toHaveAttribute(
      'href',
      '/booking',
    );
  });
});
```

- [ ] **Step 3: Убедиться, что тесты падают**

Run: `cd frontend && npx vitest run src/features/booking`
Expected: FAIL — рендерится заглушка «Бронирование», заголовок «Знакомство» не найден.

- [ ] **Step 4: Реализовать `DayList`**

`frontend/src/features/booking/DayList.tsx`:

```tsx
import { Button, Stack, Text } from '@mantine/core';

import type { DayAvailability } from '../../shared/api/types';
import { formatDayLabel } from '../../shared/format/datetime';
import { formatSlotCount } from '../../shared/format/plural';

interface DayListProps {
  days: DayAvailability[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
}

export function DayList({ days, selectedDate, onSelect }: DayListProps) {
  return (
    <Stack gap={6} role="group" aria-label="Дни окна записи">
      {days.map((day) => {
        const isEmpty = day.slots.length === 0;

        return (
          <Button
            key={day.date}
            fullWidth
            justify="space-between"
            variant={day.date === selectedDate ? 'filled' : 'default'}
            disabled={isEmpty}
            onClick={() => onSelect(day.date)}
            rightSection={
              <Text fz="xs" c={day.date === selectedDate ? undefined : 'dimmed'}>
                {isEmpty ? 'нет слотов' : formatSlotCount(day.slots.length)}
              </Text>
            }
          >
            {formatDayLabel(day.date)}
          </Button>
        );
      })}
    </Stack>
  );
}
```

- [ ] **Step 5: Реализовать `SlotGrid`**

`frontend/src/features/booking/SlotGrid.tsx`:

```tsx
import { Button, SimpleGrid, Text } from '@mantine/core';

import type { Slot } from '../../shared/api/types';
import { formatTime } from '../../shared/format/datetime';

interface SlotGridProps {
  slots: Slot[];
  selectedStartAt: string | null;
  onSelect: (slot: Slot) => void;
}

export function SlotGrid({ slots, selectedStartAt, onSelect }: SlotGridProps) {
  if (slots.length === 0) {
    return <Text c="dimmed">В этот день свободных слотов нет.</Text>;
  }

  return (
    <SimpleGrid cols={{ base: 3, sm: 4 }} spacing="xs" role="group" aria-label="Свободные слоты">
      {slots.map((slot) => (
        <Button
          key={slot.startAt}
          variant={slot.startAt === selectedStartAt ? 'filled' : 'light'}
          onClick={() => onSelect(slot)}
        >
          {formatTime(slot.startAt)}
        </Button>
      ))}
    </SimpleGrid>
  );
}
```

- [ ] **Step 6: Реализовать `BookingFlow` без формы**

Форма и отправка появятся в задаче 5; сейчас после выбора слота выводится
только подтверждающая строка с выбранным временем.

`frontend/src/features/booking/BookingFlow.tsx`:

```tsx
import { Alert, Button, Container, Grid, Group, Skeleton, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router';

import type { Slot } from '../../shared/api/types';
import { useBookingData } from '../../shared/api/useBookingData';
import { currentTimeZone, formatDateTimeLong, formatTime } from '../../shared/format/datetime';
import { DayList } from './DayList';
import { SlotGrid } from './SlotGrid';

export function BookingFlow({ eventTypeId }: { eventTypeId: string }) {
  const { data, isLoading, error, retry } = useBookingData(eventTypeId);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  if (error?.code === 'not_found') {
    return (
      <Container size="lg" py={{ base: 32, md: 64 }}>
        <Stack gap="md" align="flex-start">
          <Title order={1}>Тип встречи не найден</Title>
          <Text c="dimmed">Возможно, ссылка устарела или тип встречи удалили.</Text>
          <Button component={Link} to="/booking">
            Выбрать тип встречи
          </Button>
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="lg" py={{ base: 32, md: 64 }}>
        <Alert
          color="red"
          variant="light"
          radius="md"
          icon={<IconAlertTriangle size={20} />}
          title="Ошибка загрузки"
        >
          <Stack gap="sm" align="flex-start">
            <Text fz="sm">
              Не удалось загрузить свободное время. Проверьте, запущен ли мок-сервер.
            </Text>
            <Button size="xs" variant="light" color="red" onClick={retry}>
              Повторить
            </Button>
          </Stack>
        </Alert>
      </Container>
    );
  }

  if (isLoading || !data) {
    return (
      <Container size="lg" py={{ base: 32, md: 64 }}>
        <Stack gap="lg">
          <Skeleton height={40} width={280} />
          <Grid gutter="xl">
            <Grid.Col span={{ base: 12, md: 5 }}>
              <Skeleton height={320} radius="md" />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 7 }}>
              <Skeleton height={200} radius="md" />
            </Grid.Col>
          </Grid>
        </Stack>
      </Container>
    );
  }

  const { eventType, availability } = data;
  const days = availability.days;
  const firstDateWithSlots = days.find((day) => day.slots.length > 0)?.date ?? null;
  const activeDate = selectedDate ?? firstDateWithSlots;
  const activeDay = days.find((day) => day.date === activeDate) ?? null;

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    setSelectedSlot(null);
  }

  return (
    <Container size="lg" py={{ base: 32, md: 64 }}>
      <Stack gap="xs" mb="xl">
        <Group gap="sm" align="baseline">
          <Title order={1}>{eventType.name}</Title>
          <Text c="dimmed">{eventType.durationMinutes} мин</Text>
        </Group>
        <Text c="dimmed" maw={640}>
          {eventType.description}
        </Text>
      </Stack>

      {firstDateWithSlots === null ? (
        <Text c="dimmed">На ближайшие две недели свободных слотов нет.</Text>
      ) : (
        <Grid gutter="xl">
          <Grid.Col span={{ base: 12, md: 5 }}>
            <DayList days={days} selectedDate={activeDate} onSelect={handleSelectDate} />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 7 }}>
            <Stack gap="sm">
              <SlotGrid
                slots={activeDay?.slots ?? []}
                selectedStartAt={selectedSlot?.startAt ?? null}
                onSelect={setSelectedSlot}
              />
              <Text fz="xs" c="dimmed">
                Время указано в вашем часовом поясе ({currentTimeZone()}).
              </Text>
            </Stack>
          </Grid.Col>
        </Grid>
      )}

      {selectedSlot && (
        <Text mt="xl" fw={500}>
          Вы выбрали: {formatDateTimeLong(selectedSlot.startAt)} – {formatTime(selectedSlot.endAt)}
        </Text>
      )}
    </Container>
  );
}
```

- [ ] **Step 7: Переписать `BookingPage`**

`frontend/src/pages/BookingPage.tsx` — заменить содержимое целиком:

```tsx
import { Navigate, useParams } from 'react-router';

import { BookingFlow } from '../features/booking/BookingFlow';

export function BookingPage() {
  const { eventTypeId } = useParams();

  if (!eventTypeId) {
    return <Navigate to="/booking" replace />;
  }

  // key: при смене типа встречи поток монтируется заново и не тащит
  // выбранные день и слот от предыдущего типа.
  return <BookingFlow key={eventTypeId} eventTypeId={eventTypeId} />;
}
```

- [ ] **Step 8: Прогнать тесты**

Run: `cd frontend && npm test`
Expected: все тесты PASS. Тест `App.test.tsx` про переход на «Админка» и тесты
главной не затронуты.

- [ ] **Step 9: Прогнать типы и линтер**

Run: `cd frontend && npm run typecheck && npm run lint`
Expected: ошибок нет.

- [ ] **Step 10: Коммит**

```bash
git add frontend/src
git commit -m "feat(frontend): add day and slot pickers to booking page"
```

---

### Task 5: Форма гостя, отправка и подтверждение

**Files:**
- Create: `frontend/src/features/booking/GuestForm.tsx`, `frontend/src/features/booking/BookingSuccess.tsx`
- Modify: `frontend/src/features/booking/BookingFlow.tsx` (добавить отправку и подтверждение)
- Test: `frontend/src/features/booking/BookingSubmit.test.tsx`

**Interfaces:**
- Consumes: `createBooking(request, signal?)`, `ApiError`, `bookingFixture()`, `stubFetch`, `slotsRequestCount`, `formatDateTimeLong`, `formatTime`, `formatTimeRange`.
- Produces:
  - `interface GuestFormValues { guestName: string; guestEmail: string; comment: string }`
  - `GuestForm({ slotLabel, isSubmitting, submitError, fieldErrors, onSubmit }: GuestFormProps)`
  - `BookingSuccess({ booking }: { booking: Booking })`

- [ ] **Step 1: Написать падающие тесты отправки**

`frontend/src/features/booking/BookingSubmit.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { availabilityFixture, bookingFixture, INTRO_CALL } from '../../test/fixtures';
import { renderApp } from '../../test/renderApp';
import { slotsRequestCount, stubFetch } from '../../test/stubFetch';

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Открывает экран записи и выбирает слот 11:00. */
async function pickSlot(user: ReturnType<typeof userEvent.setup>) {
  const slots = await screen.findByRole('group', { name: 'Свободные слоты' });
  await user.click(within(slots).getByRole('button', { name: '11:00' }));
}

async function fillGuest(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Имя/), 'Пётр Иванов');
  await user.type(screen.getByLabelText(/Email/), 'petr@example.com');
}

describe('Отправка брони', () => {
  it('шлёт POST с выбранным слотом и данными гостя', async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch({
      eventType: () => Response.json(INTRO_CALL),
      slots: () => Response.json(availabilityFixture()),
      booking: () => Response.json(bookingFixture(), { status: 201 }),
    });

    renderApp('/booking/intro-call');
    await pickSlot(user);
    await fillGuest(user);
    await user.click(screen.getByRole('button', { name: 'Записаться' }));

    await waitFor(() =>
      expect(fetchMock.mock.calls.some((call) => String(call[0]).endsWith('/bookings'))).toBe(true),
    );

    const call = fetchMock.mock.calls.find((item) => String(item[0]).endsWith('/bookings'));
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({
      eventTypeId: 'intro-call',
      startAt: '2026-08-05T11:00:00Z',
      guestName: 'Пётр Иванов',
      guestEmail: 'petr@example.com',
    });
  });

  it('после 201 показывает подтверждение из ответа сервера', async () => {
    const user = userEvent.setup();
    stubFetch({
      eventType: () => Response.json(INTRO_CALL),
      slots: () => Response.json(availabilityFixture()),
      booking: () => Response.json(bookingFixture(), { status: 201 }),
    });

    renderApp('/booking/intro-call');
    await pickSlot(user);
    await fillGuest(user);
    await user.click(screen.getByRole('button', { name: 'Записаться' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Вы записаны' })).toBeInTheDocument();
    expect(screen.getByText('Анна Петрова')).toBeInTheDocument();
    expect(screen.getByText(/среда, 5 августа 2026/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Записаться ещё раз' })).toHaveAttribute(
      'href',
      '/booking',
    );
  });

  it('на 409 предупреждает и перезапрашивает слоты', async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch({
      eventType: () => Response.json(INTRO_CALL),
      slots: () => Response.json(availabilityFixture()),
      booking: () =>
        Response.json(
          {
            code: 'slot_already_booked',
            message: 'Это время уже занято другой бронью.',
          },
          { status: 409 },
        ),
    });

    renderApp('/booking/intro-call');
    await pickSlot(user);
    await fillGuest(user);
    expect(slotsRequestCount(fetchMock)).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Записаться' }));

    expect(await screen.findByText(/Это время уже заняли/)).toBeInTheDocument();
    await waitFor(() => expect(slotsRequestCount(fetchMock)).toBe(2));
  });

  it('на 422 показывает ошибку под полем email', async () => {
    const user = userEvent.setup();
    stubFetch({
      eventType: () => Response.json(INTRO_CALL),
      slots: () => Response.json(availabilityFixture()),
      booking: () =>
        Response.json(
          {
            code: 'validation_failed',
            message: 'Запрос не прошёл валидацию.',
            errors: [{ field: 'guestEmail', message: 'Укажите корректный email.' }],
          },
          { status: 422 },
        ),
    });

    renderApp('/booking/intro-call');
    await pickSlot(user);
    await fillGuest(user);
    await user.click(screen.getByRole('button', { name: 'Записаться' }));

    expect(await screen.findByText('Укажите корректный email.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Имя/)).toHaveValue('Пётр Иванов');
  });

  it('не отправляет запрос, пока email не заполнен', async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch({
      eventType: () => Response.json(INTRO_CALL),
      slots: () => Response.json(availabilityFixture()),
    });

    renderApp('/booking/intro-call');
    await pickSlot(user);
    await user.type(screen.getByLabelText(/Имя/), 'Пётр Иванов');
    await user.click(screen.getByRole('button', { name: 'Записаться' }));

    expect(await screen.findByText('Укажите корректный email')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((call) => String(call[0]).endsWith('/bookings'))).toBe(false);
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `cd frontend && npx vitest run src/features/booking/BookingSubmit.test.tsx`
Expected: FAIL — поля «Имя» и «Email» не найдены.

- [ ] **Step 3: Реализовать `GuestForm`**

`frontend/src/features/booking/GuestForm.tsx`:

```tsx
import { Alert, Button, Card, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';

export interface GuestFormValues {
  guestName: string;
  guestEmail: string;
  comment: string;
}

interface GuestFormProps {
  slotLabel: string;
  isSubmitting: boolean;
  /** Общее сообщение об ошибке отправки; ошибки конкретных полей — в fieldErrors. */
  submitError: string | null;
  /** Ошибки по полям из ответа 422: имя поля → сообщение. */
  fieldErrors: Record<string, string>;
  onSubmit: (values: GuestFormValues) => void;
}

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export function GuestForm({
  slotLabel,
  isSubmitting,
  submitError,
  fieldErrors,
  onSubmit,
}: GuestFormProps) {
  const form = useForm<GuestFormValues>({
    initialValues: { guestName: '', guestEmail: '', comment: '' },
    validate: {
      guestName: (value) => {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
          return 'Укажите имя';
        }
        return trimmed.length > 200 ? 'Не больше 200 символов' : null;
      },
      guestEmail: (value) =>
        EMAIL_PATTERN.test(value.trim()) ? null : 'Укажите корректный email',
      comment: (value) => (value.length > 1000 ? 'Не больше 1000 символов' : null),
    },
  });

  return (
    <Card withBorder radius="lg" padding="lg" mt="xl" maw={560}>
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap="md">
          <Text fw={500}>Вы выбрали: {slotLabel}</Text>

          <TextInput
            label="Имя"
            placeholder="Как к вам обращаться"
            withAsterisk
            {...form.getInputProps('guestName')}
            error={form.errors.guestName ?? fieldErrors.guestName}
          />

          <TextInput
            label="Email"
            placeholder="you@example.com"
            withAsterisk
            {...form.getInputProps('guestEmail')}
            error={form.errors.guestEmail ?? fieldErrors.guestEmail}
          />

          <Textarea
            label="Комментарий"
            placeholder="О чём хотите поговорить"
            autosize
            minRows={2}
            maxRows={6}
            {...form.getInputProps('comment')}
            error={form.errors.comment ?? fieldErrors.comment}
          />

          {submitError && (
            <Alert color="red" variant="light" radius="md">
              {submitError}
            </Alert>
          )}

          <Button type="submit" size="md" loading={isSubmitting}>
            Записаться
          </Button>
        </Stack>
      </form>
    </Card>
  );
}
```

- [ ] **Step 4: Реализовать `BookingSuccess`**

`frontend/src/features/booking/BookingSuccess.tsx`:

```tsx
import { Button, Card, Container, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { Link } from 'react-router';

import type { Booking } from '../../shared/api/types';
import { formatDateTimeLong, formatTime } from '../../shared/format/datetime';

export function BookingSuccess({ booking }: { booking: Booking }) {
  return (
    <Container size="lg" py={{ base: 32, md: 64 }}>
      <Card withBorder radius="lg" padding="xl" maw={560}>
        <Stack gap="md" align="flex-start">
          <ThemeIcon size={48} radius="xl" color="teal" variant="light">
            <IconCheck size={26} stroke={2} />
          </ThemeIcon>

          <Title order={1} fz="h2">
            Вы записаны
          </Title>

          <Stack gap={4}>
            <Text c="dimmed" fz="sm">
              {booking.eventType.name} · {booking.eventType.durationMinutes} мин
            </Text>
            <Text fw={600}>
              {formatDateTimeLong(booking.startAt)} – {formatTime(booking.endAt)}
            </Text>
          </Stack>

          <Stack gap={4}>
            <Text>{booking.guestName}</Text>
            <Text c="dimmed" fz="sm">
              {booking.guestEmail}
            </Text>
            {booking.comment && (
              <Text c="dimmed" fz="sm">
                {booking.comment}
              </Text>
            )}
          </Stack>

          <Group gap="sm">
            <Button component={Link} to="/booking">
              Записаться ещё раз
            </Button>
            <Button component={Link} to="/" variant="default">
              На главную
            </Button>
          </Group>
        </Stack>
      </Card>
    </Container>
  );
}
```

- [ ] **Step 5: Подключить отправку в `BookingFlow`**

В `frontend/src/features/booking/BookingFlow.tsx` внести четыре правки.

Первая — импорты. Заменить блок импортов на:

```tsx
import { Alert, Button, Container, Grid, Group, Skeleton, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle, IconClockExclamation } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { createBooking } from '../../shared/api/endpoints';
import { ApiError, type Booking, type Slot } from '../../shared/api/types';
import { useBookingData } from '../../shared/api/useBookingData';
import { currentTimeZone, formatDateTimeLong, formatTime } from '../../shared/format/datetime';
import { BookingSuccess } from './BookingSuccess';
import { DayList } from './DayList';
import { GuestForm, type GuestFormValues } from './GuestForm';
import { SlotGrid } from './SlotGrid';
```

Вторая — состояние. Сразу после `const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);` добавить:

```tsx
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<ApiError | null>(null);

  if (booking) {
    return <BookingSuccess booking={booking} />;
  }
```

Третья — обработчик отправки. Рядом с `handleSelectDate` добавить:

```tsx
  async function handleSubmit(values: GuestFormValues) {
    if (!selectedSlot) {
      return;
    }

    const comment = values.comment.trim();

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const created = await createBooking({
        eventTypeId,
        startAt: selectedSlot.startAt,
        guestName: values.guestName.trim(),
        guestEmail: values.guestEmail.trim(),
        ...(comment ? { comment } : {}),
      });
      setBooking(created);
    } catch (cause) {
      const apiError =
        cause instanceof ApiError
          ? cause
          : new ApiError('unknown_error', 'Не удалось создать запись', 0);
      setSubmitError(apiError);

      // Слот заняли, пока гость заполнял форму: сбрасываем выбор и
      // перезапрашиваем свободное время, как требует контракт.
      if (apiError.code === 'slot_already_booked') {
        setSelectedSlot(null);
        retry();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const fieldErrors = Object.fromEntries(
    (submitError?.fieldErrors ?? []).map((item) => [item.field, item.message]),
  );
  const generalSubmitError =
    submitError && submitError.code !== 'slot_already_booked' ? submitError.message : null;
```

Четвёртая — разметка. Заменить блок `{selectedSlot && (...)}` в конце компонента на:

```tsx
      {selectedSlot && (
        <GuestForm
          slotLabel={`${formatDateTimeLong(selectedSlot.startAt)} – ${formatTime(selectedSlot.endAt)}`}
          isSubmitting={isSubmitting}
          submitError={generalSubmitError}
          fieldErrors={fieldErrors}
          onSubmit={handleSubmit}
        />
      )}
```

И вставить предупреждение о занятом слоте сразу после блока с заголовком
(`</Stack>` перед `{firstDateWithSlots === null ? ...}`):

```tsx
      {submitError?.code === 'slot_already_booked' && (
        <Alert
          color="yellow"
          variant="light"
          radius="md"
          mb="lg"
          icon={<IconClockExclamation size={20} />}
        >
          Это время уже заняли, выберите другое.
        </Alert>
      )}
```

Важно: `{submitError?.code === 'slot_already_booked' && ...}` должен
рендериться и в ветке загрузки — после `retry()` данные обнуляются и экран
уходит в скелетон. Поэтому в ветке `if (isLoading || !data)` добавить этот же
алерт перед `<Stack gap="lg">`, обернув содержимое в фрагмент:

```tsx
  if (isLoading || !data) {
    return (
      <Container size="lg" py={{ base: 32, md: 64 }}>
        {submitError?.code === 'slot_already_booked' && (
          <Alert
            color="yellow"
            variant="light"
            radius="md"
            mb="lg"
            icon={<IconClockExclamation size={20} />}
          >
            Это время уже заняли, выберите другое.
          </Alert>
        )}
        <Stack gap="lg">
          <Skeleton height={40} width={280} />
          <Grid gutter="xl">
            <Grid.Col span={{ base: 12, md: 5 }}>
              <Skeleton height={320} radius="md" />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 7 }}>
              <Skeleton height={200} radius="md" />
            </Grid.Col>
          </Grid>
        </Stack>
      </Container>
    );
  }
```

- [ ] **Step 6: Проверить тесты отправки**

Run: `cd frontend && npx vitest run src/features/booking`
Expected: все тесты PASS.

Обрати внимание на порядок в `error={form.errors.guestEmail ?? fieldErrors.guestEmail}`:
локальная ошибка приоритетнее серверной. В тесте на 422 адрес
`petr@example.com` проходит локальную проверку, поэтому `form.errors.guestEmail`
равно `undefined` и показывается сообщение сервера.

- [ ] **Step 7: Прогнать всё**

Run: `cd frontend && npm test && npm run typecheck && npm run lint && npm run build`
Expected: все тесты PASS, типы и линтер чисты, сборка успешна.

- [ ] **Step 8: Коммит**

```bash
git add frontend/src
git commit -m "feat(frontend): submit bookings with guest form and confirmation"
```

---

### Task 6: Документация и проверка против живого мока

**Files:**
- Modify: `frontend/README.md`

**Interfaces:**
- Consumes: рабочее приложение из задач 1–5, `spec/npm run mock`.
- Produces: документацию, кода не добавляет.

- [ ] **Step 1: Обновить README**

В `frontend/README.md` заменить раздел «Что реализовано» на:

```markdown
## Что реализовано

- `/` — главная: шапка, hero с CTA, типы встреч из `GET /event-types`, возможности.
- `/booking` — выбор типа встречи.
- `/booking/:eventTypeId` — выбор дня и слота, форма гостя, подтверждение записи.
- `/admin` — заглушка «Скоро».

## Особенности работы с моком

Prism не хранит состояние, поэтому две вещи выглядят странно, но работают
как задумано:

- `POST /bookings` всегда возвращает одну и ту же бронь из фикстуры (Анна
  Петрова, первый свободный слот `intro-call`) независимо от отправленных
  данных. Экран подтверждения показывает ответ сервера, поэтому имя и время
  там не совпадут с введёнными.
- Ответы ручек по идентификатору типа события выбираются заголовком
  `Prefer: example=<eventTypeId>` — его шлёт `src/shared/api/endpoints.ts`.
  Без него мок отдавал бы слоты `intro-call` для любого типа. Настоящий
  бэкенд заголовок проигнорирует.
```

- [ ] **Step 2: Проверить поток против живого мока**

```bash
cd spec && npm run mock &
cd frontend && npm run dev
```

Открыть `http://localhost:5173/booking` и проверить:
- три типа встреч, клик по «Ревью дизайна» ведёт на `/booking/design-review`;
- длительность слотов там 60 минут, а не 30 — значит заголовок `Prefer` работает;
- дни без слотов (выходные) неактивны и помечены «нет слотов»;
- выбор слота раскрывает форму; отправка с корректными данными даёт экран
  «Вы записаны»;
- отправка с email `not-an-email` не уходит на сервер — ошибка под полем.

Остановить оба процесса после проверки.

- [ ] **Step 3: Финальная проверка**

Run: `cd frontend && npm test && npm run lint && npm run build`
Expected: все тесты PASS, линтер чист, сборка успешна.

- [ ] **Step 4: Коммит**

```bash
git add frontend/README.md
git commit -m "docs(frontend): document booking flow and mock quirks"
```

---

## Соответствие спеке

| Требование спеки | Задача |
|---|---|
| Формат времени в поясе браузера, подпись зоны | 1, 4 |
| `TZ=UTC` в тестах | 1 |
| `apiPost`, `CreateBookingRequest` | 2 |
| `endpoints.ts` с заголовком `Prefer` | 2 |
| `useApiResource`, переписанный `useEventTypes`, `useBookingData` | 2 |
| `EventTypeCard` в `shared/ui`, переиспользование на главной | 3 |
| Страница `/booking` с выбором типа | 3 |
| Список 14 дней, неактивные дни без слотов | 4 |
| Сетка слотов выбранного дня | 4 |
| Страница «Тип встречи не найден» на 404 | 4 |
| Алерт с «Повторить» на сеть и 5xx | 4 |
| «На ближайшие две недели свободных слотов нет» | 4 |
| Форма на `@mantine/form` с правилами контракта | 5 |
| Отправка `POST /bookings` с `startAt` из ответа API | 5 |
| Подтверждение по ответу сервера | 5 |
| 409 — предупреждение и перезапрос слотов | 5 |
| 422 — ошибки под полями, форма не сбрасывается | 5 |
| Тесты 1–9 из спеки | 1 (9), 3 (1), 4 (2, 3, 8), 5 (4, 5, 6, 7) |
| Пометка про фиксированный ответ мока в README | 6 |

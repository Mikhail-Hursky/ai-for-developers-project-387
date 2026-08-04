# Страница админки — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить заглушку `/admin` рабочей страницей с двумя вкладками: единый список предстоящих встреч всех типов событий и создание типа события.

**Architecture:** `AdminPage` остаётся тонким каркасом: заголовок и `Tabs`, активная вкладка хранится в query-параметре `?tab=`. Данные грузят сами вкладки: `UpcomingBookings` поверх нового хука `useUpcomingBookings`, `EventTypesAdmin` — поверх существующего `useEventTypes`. Оба хука построены на `useApiResource`, запросы живут в `endpoints.ts`. Форма создания типа — отдельный презентационный компонент на `@mantine/form`, состояние отправки держит `EventTypesAdmin`.

**Tech Stack:** React 19, TypeScript strict, Mantine 9 (`@mantine/core`, `@mantine/form`), React Router 7, Vitest 4 + Testing Library.

**Спека:** [docs/superpowers/specs/2026-08-04-admin-page-design.md](../specs/2026-08-04-admin-page-design.md)

## Global Constraints

- Работаем только в каталоге `frontend/`. Каталоги `spec/` и `.github/` не трогаем.
- Новых зависимостей нет. `@mantine/notifications` и `@mantine/dates` не подключаем.
- TypeScript strict как в проекте: `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, никаких `any`, `@ts-ignore` и non-null assertion `!`.
- Vitest без `globals`: `describe`/`it`/`expect`/`vi` импортируются явно из `vitest`.
- Импорты React Router — из пакета `react-router`.
- Правило линтера `react-hooks/set-state-in-effect` включено: синхронный `setState` в теле `useEffect` запрещён.
- Весь пользовательский текст — на русском, ровно теми формулировками, что указаны в шагах.
- Локаль форматирования — `ru-RU`, ключ группировки по дню — `en-CA` (даёт `YYYY-MM-DD`). Часовой пояс в тестах зафиксирован как `UTC` в `vite.config.ts`.
- Ограничения полей повторяют контракт `spec/main.tsp`: `id` — `^[a-z0-9]+(-[a-z0-9]+)*$`, ≤ 100; `name` — 1–150; `description` — ≤ 2000; `durationMinutes` — целое 1–1440.
- Коммиты — на английском, в формате Conventional Commits, после каждой задачи.
- Все команды запускаются из каталога `frontend/`.

## Файловая структура

| Файл | Ответственность |
|---|---|
| `src/shared/format/datetime.ts` | + `localDateKey`, `formatDateLong` |
| `src/shared/api/types.ts` | + `CreateEventTypeRequest` |
| `src/shared/api/endpoints.ts` | + `fetchUpcomingBookings`, `createEventType` |
| `src/shared/api/useUpcomingBookings.ts` | Обёртка над `useApiResource` для списка встреч |
| `src/features/admin/UpcomingBookings.tsx` | Четыре состояния списка встреч + группировка по дням |
| `src/features/admin/BookingCard.tsx` | Одна встреча в списке |
| `src/features/admin/EventTypesAdmin.tsx` | Список типов, модалка создания, склейка с моком |
| `src/features/admin/EventTypeForm.tsx` | Форма создания типа события |
| `src/pages/AdminPage.tsx` | Каркас: заголовок, вкладки, параметр `?tab=` |
| `src/test/stubFetch.ts` | + маршруты админских ручек |
| `src/test/fixtures.ts` | + фикстуры встреч и типов событий |
| `src/test/renderUi.tsx` | Рендер отдельного компонента без роутера |

Уточнение против спеки: добавился хелпер `src/test/renderUi.tsx` — вкладки
тестируются как отдельные компоненты, а не только через `renderApp`, иначе
каждый тест формы тащил бы за собой весь роутер. Компактный список типов
событий живёт локальным компонентом внутри `EventTypesAdmin.tsx`: он нужен
только там и отдельного файла не заслуживает.

---

### Task 1: Форматирование дня встречи

**Files:**
- Modify: `frontend/src/shared/format/datetime.ts`
- Test: `frontend/src/shared/format/datetime.test.ts`

**Interfaces:**
- Consumes: ничего.
- Produces:
  - `localDateKey(isoDateTime: string, timeZone?: string): string`
  - `formatDateLong(isoDateTime: string, timeZone?: string): string`

- [ ] **Step 1: Написать падающие тесты**

В конец `frontend/src/shared/format/datetime.test.ts` добавить:

```ts
describe('localDateKey', () => {
  it('даёт календарный день в указанном поясе', () => {
    expect(localDateKey('2026-08-05T11:00:00Z', 'UTC')).toBe('2026-08-05');
  });

  it('учитывает сдвиг пояса на границе суток', () => {
    expect(localDateKey('2026-08-05T22:30:00Z', 'Europe/Minsk')).toBe('2026-08-06');
  });
});

describe('formatDateLong', () => {
  it('пишет день недели, число и месяц словами', () => {
    expect(formatDateLong('2026-08-05T11:00:00Z', 'UTC')).toBe('среда, 5 августа');
  });
});
```

В блоке импортов того же файла заменить строки на:

```ts
import {
  currentTimeZone,
  formatDateLong,
  formatDateTimeLong,
  formatDayLabel,
  formatTime,
  formatTimeRange,
  localDateKey,
} from './datetime';
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npm test -- src/shared/format/datetime.test.ts`
Expected: FAIL — `localDateKey is not a function` / ошибка типов при импорте.

- [ ] **Step 3: Реализовать функции**

В конец `frontend/src/shared/format/datetime.ts` добавить:

```ts
/**
 * `2026-08-05T22:30:00Z` → `2026-08-06` в поясе `Europe/Minsk`.
 * Ключ группировки броней по календарному дню: локаль `en-CA` отдаёт готовый
 * `YYYY-MM-DD`, поэтому арифметика со смещениями пояса не нужна.
 */
export function localDateKey(isoDateTime: string, timeZone: string = currentTimeZone()): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).format(new Date(isoDateTime));
}

/**
 * `2026-08-05T11:00:00Z` → `среда, 5 августа`.
 * В отличие от `formatDayLabel` берёт момент времени и считает день
 * в местном поясе, а не календарную дату в UTC.
 */
export function formatDateLong(isoDateTime: string, timeZone: string = currentTimeZone()): string {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone,
  }).format(new Date(isoDateTime));
}
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npm test -- src/shared/format/datetime.test.ts`
Expected: PASS, все блоки зелёные.

- [ ] **Step 5: Коммит**

```bash
git add src/shared/format/datetime.ts src/shared/format/datetime.test.ts
git commit -m "feat(format): add local day key and long date formatting"
```

---

### Task 2: Слой API и тестовые хелперы

**Files:**
- Modify: `frontend/src/shared/api/types.ts`, `frontend/src/shared/api/endpoints.ts`, `frontend/src/test/stubFetch.ts`, `frontend/src/test/fixtures.ts`
- Create: `frontend/src/shared/api/useUpcomingBookings.ts`, `frontend/src/test/renderUi.tsx`
- Test: `frontend/src/shared/api/endpoints.test.ts`

**Interfaces:**
- Consumes: `apiGet`, `apiPost` из `./client`; `useApiResource`, `ApiResource` из `./useApiResource`.
- Produces:
  - `interface CreateEventTypeRequest { id: string; name: string; description: string; durationMinutes: number }`
  - `fetchUpcomingBookings(signal: AbortSignal): Promise<Booking[]>`
  - `createEventType(request: CreateEventTypeRequest, signal?: AbortSignal): Promise<EventType>`
  - `useUpcomingBookings(): ApiResource<Booking[]>`
  - `renderUi(ui: ReactNode): RenderResult`
  - Поля `FetchRoutes`: `upcomingBookings?: () => Response`, `createEventType?: () => Response`
  - Фикстуры: `DESIGN_REVIEW: EventType`, `STRATEGY_SESSION: EventType`, `upcomingBookingsFixture(): Booking[]`

- [ ] **Step 1: Написать падающие тесты для запросов**

В `frontend/src/shared/api/endpoints.test.ts` заменить строку импорта на:

```ts
import {
  createBooking,
  createEventType,
  fetchAvailability,
  fetchEventType,
  fetchEventTypes,
  fetchUpcomingBookings,
} from './endpoints';
```

и добавить перед закрывающей скобкой `describe('endpoints', ...)`:

```ts
  it('запрашивает предстоящие встречи админской ручкой', async () => {
    const fetchMock = stub();

    await fetchUpcomingBookings(new AbortController().signal);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${apiBaseUrl}/admin/bookings/upcoming`);
    expect(headerOf(fetchMock.mock.calls[0]?.[1], 'Prefer')).toBeNull();
  });

  it('создаёт тип события методом POST', async () => {
    const fetchMock = stub();

    await createEventType({
      id: 'strategy-session',
      name: 'Стратегическая сессия',
      description: 'Полтора часа на планирование квартала.',
      durationMinutes: 90,
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${apiBaseUrl}/admin/event-types`);
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      id: 'strategy-session',
      name: 'Стратегическая сессия',
      description: 'Полтора часа на планирование квартала.',
      durationMinutes: 90,
    });
  });
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npm test -- src/shared/api/endpoints.test.ts`
Expected: FAIL — `fetchUpcomingBookings is not a function`.

- [ ] **Step 3: Добавить тип запроса**

В конец `frontend/src/shared/api/types.ts` добавить:

```ts
/** Все поля типа события задаёт владелец, включая `id` (контракт: `...EventType`). */
export interface CreateEventTypeRequest {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
}
```

- [ ] **Step 4: Добавить функции запросов**

В `frontend/src/shared/api/endpoints.ts` заменить строку импорта типов на:

```ts
import type {
  Availability,
  Booking,
  CreateBookingRequest,
  CreateEventTypeRequest,
  EventType,
} from './types';
```

и добавить в конец файла:

```ts
export function fetchUpcomingBookings(signal: AbortSignal): Promise<Booking[]> {
  return apiGet<Booking[]>('/admin/bookings/upcoming', { signal });
}

export function createEventType(
  request: CreateEventTypeRequest,
  signal?: AbortSignal,
): Promise<EventType> {
  return apiPost<EventType>('/admin/event-types', request, { signal });
}
```

Заголовок `Prefer` этим ручкам не нужен: примеров, выбираемых по идентификатору, у них нет.

- [ ] **Step 5: Убедиться, что тесты запросов проходят**

Run: `npm test -- src/shared/api/endpoints.test.ts`
Expected: PASS.

- [ ] **Step 6: Добавить хук загрузки встреч**

Создать `frontend/src/shared/api/useUpcomingBookings.ts`:

```ts
import { useCallback } from 'react';

import { fetchUpcomingBookings } from './endpoints';
import type { Booking } from './types';
import { useApiResource, type ApiResource } from './useApiResource';

export function useUpcomingBookings(): ApiResource<Booking[]> {
  const loader = useCallback((signal: AbortSignal) => fetchUpcomingBookings(signal), []);

  return useApiResource(loader);
}
```

- [ ] **Step 7: Научить stubFetch админским путям**

В `frontend/src/test/stubFetch.ts` заменить интерфейс `FetchRoutes` и тело `fetchMock` на:

```ts
export interface FetchRoutes {
  /** `GET /event-types/{id}` */
  eventType?: () => Response;
  /** `GET /event-types/{id}/slots` */
  slots?: () => Response;
  /** `POST /bookings` */
  booking?: () => Response;
  /** `GET /event-types` */
  eventTypes?: () => Response;
  /** `GET /admin/bookings/upcoming` */
  upcomingBookings?: () => Response;
  /** `POST /admin/event-types` */
  createEventType?: () => Response;
}

/**
 * Подменяет `fetch` и раздаёт ответы по URL. Порядок проверок важен:
 * админские пути идут первыми (`/admin/event-types` заканчивается на
 * `/event-types`), а путь слотов содержит в себе путь типа события.
 */
export function stubFetch(routes: FetchRoutes) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = String(input);

    if (url.endsWith('/admin/bookings/upcoming') && routes.upcomingBookings) {
      return routes.upcomingBookings();
    }
    if (url.endsWith('/admin/event-types') && routes.createEventType) {
      return routes.createEventType();
    }
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
```

Остальное содержимое файла (импорт `vi`, функция `slotsRequestCount`) не трогать.

- [ ] **Step 8: Добавить фикстуры**

В конец `frontend/src/test/fixtures.ts` добавить:

```ts
export const DESIGN_REVIEW: EventType = {
  id: 'design-review',
  name: 'Ревью дизайна',
  description: 'Разбираем макеты и собираем список правок.',
  durationMinutes: 60,
};

/** Тип события, который мок возвращает на `POST /admin/event-types`. */
export const STRATEGY_SESSION: EventType = {
  id: 'strategy-session',
  name: 'Стратегическая сессия',
  description: 'Полтора часа на планирование квартала.',
  durationMinutes: 90,
};

/** Две встречи разных типов в разные дни — хватает, чтобы проверить группировку. */
export function upcomingBookingsFixture(): Booking[] {
  return [
    bookingFixture(),
    {
      id: '7c9e2d4b-2b77-4f8e-8a3c-2f1d5e6b7a02',
      eventType: DESIGN_REVIEW,
      startAt: '2026-08-07T12:00:00Z',
      endAt: '2026-08-07T13:00:00Z',
      guestName: 'Игорь Северов',
      guestEmail: 'igor.severov@example.com',
      createdAt: '2026-08-02T09:30:00Z',
    },
  ];
}
```

- [ ] **Step 9: Добавить рендер отдельного компонента**

Создать `frontend/src/test/renderUi.tsx`:

```tsx
import { MantineProvider } from '@mantine/core';
import { render, type RenderResult } from '@testing-library/react';
import type { ReactNode } from 'react';

import { theme } from '../theme';

/** Рендер отдельного компонента без роутера — для вкладок админки и форм. */
export function renderUi(ui: ReactNode): RenderResult {
  return render(
    <MantineProvider theme={theme} env="test">
      {ui}
    </MantineProvider>,
  );
}
```

- [ ] **Step 10: Прогнать всё и закоммитить**

Run: `npm test && npm run lint && npm run typecheck`
Expected: все тесты зелёные, линтер и типы без ошибок.

```bash
git add src/shared/api src/test
git commit -m "feat(api): add admin endpoints and test helpers"
```

---

### Task 3: Вкладка «Предстоящие встречи»

**Files:**
- Create: `frontend/src/features/admin/UpcomingBookings.tsx`, `frontend/src/features/admin/BookingCard.tsx`
- Test: `frontend/src/features/admin/UpcomingBookings.test.tsx`

**Interfaces:**
- Consumes: `useUpcomingBookings()`, `localDateKey`, `formatDateLong`, `formatTimeRange`, `currentTimeZone`, тип `Booking`, `renderUi`, `stubFetch`, `upcomingBookingsFixture`.
- Produces:
  - `<UpcomingBookings />` — без пропсов, грузит данные сама.
  - `<BookingCard booking={booking} />`

- [ ] **Step 1: Написать падающие тесты**

Создать `frontend/src/features/admin/UpcomingBookings.test.tsx`:

```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { upcomingBookingsFixture } from '../../test/fixtures';
import { renderUi } from '../../test/renderUi';
import { stubFetch } from '../../test/stubFetch';
import { UpcomingBookings } from './UpcomingBookings';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('UpcomingBookings', () => {
  it('группирует встречи по дням и показывает гостя с типом события', async () => {
    stubFetch({ upcomingBookings: () => Response.json(upcomingBookingsFixture()) });

    renderUi(<UpcomingBookings />);

    expect(await screen.findByText('среда, 5 августа')).toBeInTheDocument();
    expect(screen.getByText('пятница, 7 августа')).toBeInTheDocument();
    expect(screen.getByText('11:00 – 11:30')).toBeInTheDocument();
    expect(screen.getByText('Знакомство · 30 мин')).toBeInTheDocument();
    expect(screen.getByText('Анна Петрова')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'igor.severov@example.com' })).toHaveAttribute(
      'href',
      'mailto:igor.severov@example.com',
    );
  });

  it('показывает комментарий гостя, если он есть', async () => {
    stubFetch({ upcomingBookings: () => Response.json(upcomingBookingsFixture()) });

    renderUi(<UpcomingBookings />);

    expect(await screen.findByText('Хочу обсудить редизайн лендинга.')).toBeInTheDocument();
  });

  it('сообщает, что встреч нет', async () => {
    stubFetch({ upcomingBookings: () => Response.json([]) });

    renderUi(<UpcomingBookings />);

    expect(await screen.findByText('Предстоящих встреч пока нет.')).toBeInTheDocument();
  });

  it('после ошибки повторяет запрос по кнопке', async () => {
    const user = userEvent.setup();
    let attempt = 0;
    const fetchMock = stubFetch({
      upcomingBookings: () => {
        attempt += 1;
        return attempt === 1
          ? Response.json({ code: 'unknown_error', message: 'Сбой' }, { status: 500 })
          : Response.json(upcomingBookingsFixture());
      },
    });

    renderUi(<UpcomingBookings />);

    expect(await screen.findByText(/Не удалось загрузить предстоящие встречи/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByText('Анна Петрова')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npm test -- src/features/admin/UpcomingBookings.test.tsx`
Expected: FAIL — модуль `./UpcomingBookings` не найден.

- [ ] **Step 3: Написать карточку встречи**

Создать `frontend/src/features/admin/BookingCard.tsx`:

```tsx
import { Anchor, Badge, Card, Group, Stack, Text } from '@mantine/core';

import type { Booking } from '../../shared/api/types';
import { formatTimeRange } from '../../shared/format/datetime';

export function BookingCard({ booking }: { booking: Booking }) {
  return (
    <Card withBorder radius="lg" padding="md">
      <Stack gap="xs">
        <Group gap="sm" wrap="nowrap" justify="space-between">
          <Text fw={600}>{formatTimeRange(booking.startAt, booking.endAt)}</Text>
          <Badge variant="light" radius="sm">
            {booking.eventType.name} · {booking.eventType.durationMinutes} мин
          </Badge>
        </Group>

        <Group gap={6} wrap="wrap">
          <Text fz="sm">{booking.guestName}</Text>
          <Text fz="sm" c="dimmed">
            ·
          </Text>
          <Anchor href={`mailto:${booking.guestEmail}`} fz="sm">
            {booking.guestEmail}
          </Anchor>
        </Group>

        {booking.comment && (
          <Text fz="sm" c="dimmed" fs="italic">
            {booking.comment}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
```

- [ ] **Step 4: Написать список встреч**

Создать `frontend/src/features/admin/UpcomingBookings.tsx`:

```tsx
import { Alert, Button, Skeleton, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

import type { Booking } from '../../shared/api/types';
import { useUpcomingBookings } from '../../shared/api/useUpcomingBookings';
import { currentTimeZone, formatDateLong, localDateKey } from '../../shared/format/datetime';
import { BookingCard } from './BookingCard';

interface BookingsDay {
  key: string;
  label: string;
  bookings: Booking[];
}

/**
 * Режет список на группы по календарному дню в местном поясе. Порядок
 * сохраняется: ручка уже отдала брони по возрастанию `startAt`, сортировать
 * заново не нужно.
 */
function groupByDay(bookings: Booking[]): BookingsDay[] {
  const days: BookingsDay[] = [];

  for (const booking of bookings) {
    const key = localDateKey(booking.startAt);
    const lastDay = days.at(-1);

    if (lastDay?.key === key) {
      lastDay.bookings.push(booking);
    } else {
      days.push({ key, label: formatDateLong(booking.startAt), bookings: [booking] });
    }
  }

  return days;
}

export function UpcomingBookings() {
  const { data, isLoading, error, retry } = useUpcomingBookings();

  if (isLoading) {
    return (
      <Stack gap="md">
        <Skeleton height={20} width={180} />
        <Skeleton height={96} radius="lg" />
        <Skeleton height={96} radius="lg" />
      </Stack>
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
          <Text fz="sm">
            Не удалось загрузить предстоящие встречи. Проверьте, запущен ли мок-сервер.
          </Text>
          <Button size="xs" variant="light" color="red" onClick={retry}>
            Повторить
          </Button>
        </Stack>
      </Alert>
    );
  }

  if (!data || data.length === 0) {
    return <Text c="dimmed">Предстоящих встреч пока нет.</Text>;
  }

  return (
    <Stack gap="xl">
      {groupByDay(data).map((day) => (
        <Stack key={day.key} gap="sm">
          <Title order={2} fz="md" tt="capitalize">
            {day.label}
          </Title>
          {day.bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </Stack>
      ))}

      <Text fz="xs" c="dimmed">
        Время указано в вашем часовом поясе ({currentTimeZone()}).
      </Text>
    </Stack>
  );
}
```

- [ ] **Step 5: Убедиться, что тесты проходят**

Run: `npm test -- src/features/admin/UpcomingBookings.test.tsx`
Expected: PASS, четыре теста.

- [ ] **Step 6: Прогнать всё и закоммитить**

Run: `npm test && npm run lint && npm run typecheck`
Expected: зелено.

```bash
git add src/features/admin
git commit -m "feat(admin): add upcoming bookings list grouped by day"
```

---

### Task 4: Форма создания типа события

**Files:**
- Create: `frontend/src/features/admin/EventTypeForm.tsx`
- Test: `frontend/src/features/admin/EventTypeForm.test.tsx`

**Interfaces:**
- Consumes: `@mantine/form`, `renderUi`, тип `CreateEventTypeRequest`.
- Produces:
  - `<EventTypeForm isSubmitting submitError fieldErrors onSubmit onCancel />`, где
    `isSubmitting: boolean`, `submitError: string | null`,
    `fieldErrors: Record<string, string>`,
    `onSubmit: (values: CreateEventTypeRequest) => void`, `onCancel: () => void`.
    В `onSubmit` уходят обрезанные строки и `durationMinutes` числом.

- [ ] **Step 1: Написать падающие тесты**

Создать `frontend/src/features/admin/EventTypeForm.test.tsx`:

```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/renderUi';
import { EventTypeForm } from './EventTypeForm';

function setup(overrides: { fieldErrors?: Record<string, string> } = {}) {
  const onSubmit = vi.fn();
  renderUi(
    <EventTypeForm
      isSubmitting={false}
      submitError={null}
      fieldErrors={overrides.fieldErrors ?? {}}
      onSubmit={onSubmit}
      onCancel={() => {}}
    />,
  );
  return { onSubmit, user: userEvent.setup() };
}

describe('EventTypeForm', () => {
  it('не отправляет пустую форму и показывает ошибки полей', async () => {
    const { onSubmit, user } = setup();

    await user.click(screen.getByRole('button', { name: 'Создать' }));

    expect(await screen.findByText('Укажите идентификатор')).toBeInTheDocument();
    expect(screen.getByText('Укажите название')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('требует правильный формат идентификатора', async () => {
    const { onSubmit, user } = setup();

    await user.type(screen.getByLabelText(/Идентификатор/), 'Intro Call');
    await user.type(screen.getByLabelText(/Название/), 'Знакомство');
    await user.click(screen.getByRole('button', { name: 'Создать' }));

    expect(
      await screen.findByText('Латиница в нижнем регистре, цифры и дефисы, например intro-call'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('не пропускает длительность вне диапазона', async () => {
    const { onSubmit, user } = setup();

    await user.type(screen.getByLabelText(/Идентификатор/), 'intro-call');
    await user.type(screen.getByLabelText(/Название/), 'Знакомство');
    await user.clear(screen.getByLabelText(/Длительность/));
    await user.type(screen.getByLabelText(/Длительность/), '0');
    await user.click(screen.getByRole('button', { name: 'Создать' }));

    expect(await screen.findByText('От 1 до 1440 минут')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('не пропускает пустую длительность', async () => {
    const { onSubmit, user } = setup();

    await user.type(screen.getByLabelText(/Идентификатор/), 'intro-call');
    await user.type(screen.getByLabelText(/Название/), 'Знакомство');
    await user.clear(screen.getByLabelText(/Длительность/));
    await user.click(screen.getByRole('button', { name: 'Создать' }));

    expect(await screen.findByText('Укажите длительность')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('отдаёт обрезанные значения и число минут', async () => {
    const { onSubmit, user } = setup();

    await user.type(screen.getByLabelText(/Идентификатор/), 'strategy-session');
    await user.type(screen.getByLabelText(/Название/), '  Стратегическая сессия  ');
    await user.type(screen.getByLabelText(/Описание/), 'Планирование квартала.');
    await user.clear(screen.getByLabelText(/Длительность/));
    await user.type(screen.getByLabelText(/Длительность/), '90');
    await user.click(screen.getByRole('button', { name: 'Создать' }));

    expect(onSubmit).toHaveBeenCalledWith({
      id: 'strategy-session',
      name: 'Стратегическая сессия',
      description: 'Планирование квартала.',
      durationMinutes: 90,
    });
  });

  it('показывает ошибку поля, пришедшую с сервера', () => {
    setup({ fieldErrors: { id: 'Тип события с таким id уже существует.' } });

    expect(screen.getByText('Тип события с таким id уже существует.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npm test -- src/features/admin/EventTypeForm.test.tsx`
Expected: FAIL — модуль `./EventTypeForm` не найден.

- [ ] **Step 3: Написать форму**

Создать `frontend/src/features/admin/EventTypeForm.tsx`:

```tsx
import { Alert, Button, Group, NumberInput, Stack, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';

import type { CreateEventTypeRequest } from '../../shared/api/types';

interface EventTypeFormValues {
  id: string;
  name: string;
  description: string;
  /** `NumberInput` хранит пустое значение строкой, поэтому тип шире числа. */
  durationMinutes: number | string;
}

interface EventTypeFormProps {
  isSubmitting: boolean;
  /** Общее сообщение об ошибке отправки; ошибки конкретных полей — в fieldErrors. */
  submitError: string | null;
  /** Ошибки по полям из ответов 409 и 422: имя поля → сообщение. */
  fieldErrors: Record<string, string>;
  onSubmit: (values: CreateEventTypeRequest) => void;
  onCancel: () => void;
}

// Ограничения повторяют контракт: spec/main.tsp, модель EventType.
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DEFAULT_DURATION_MINUTES = 30;

export function EventTypeForm({
  isSubmitting,
  submitError,
  fieldErrors,
  onSubmit,
  onCancel,
}: EventTypeFormProps) {
  const form = useForm<EventTypeFormValues>({
    initialValues: {
      id: '',
      name: '',
      description: '',
      durationMinutes: DEFAULT_DURATION_MINUTES,
    },
    validate: {
      id: (value) => {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
          return 'Укажите идентификатор';
        }
        if (trimmed.length > 100) {
          return 'Не больше 100 символов';
        }
        return ID_PATTERN.test(trimmed)
          ? null
          : 'Латиница в нижнем регистре, цифры и дефисы, например intro-call';
      },
      name: (value) => {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
          return 'Укажите название';
        }
        return trimmed.length > 150 ? 'Не больше 150 символов' : null;
      },
      description: (value) => (value.length > 2000 ? 'Не больше 2000 символов' : null),
      durationMinutes: (value) => {
        if (value === '') {
          return 'Укажите длительность';
        }
        const minutes = Number(value);
        if (!Number.isInteger(minutes)) {
          return 'Укажите целое число минут';
        }
        return minutes >= 1 && minutes <= 1440 ? null : 'От 1 до 1440 минут';
      },
    },
  });

  function handleSubmit(values: EventTypeFormValues) {
    onSubmit({
      id: values.id.trim(),
      name: values.name.trim(),
      description: values.description.trim(),
      durationMinutes: Number(values.durationMinutes),
    });
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <TextInput
          label="Идентификатор"
          description="Попадёт в адрес страницы записи: /booking/intro-call"
          placeholder="intro-call"
          withAsterisk
          {...form.getInputProps('id')}
          error={form.errors.id ?? fieldErrors.id}
        />

        <TextInput
          label="Название"
          placeholder="Знакомство"
          withAsterisk
          {...form.getInputProps('name')}
          error={form.errors.name ?? fieldErrors.name}
        />

        <Textarea
          label="Описание"
          placeholder="О чём эта встреча"
          autosize
          minRows={2}
          maxRows={6}
          {...form.getInputProps('description')}
          error={form.errors.description ?? fieldErrors.description}
        />

        {/*
          clampBehavior="none": по умолчанию NumberInput подтягивает значение
          к min/max при потере фокуса. Введённое молча подменялось бы, и
          владелец не понял бы, почему в поле не то, что он набрал. Границы
          проверяет валидация формы, а min/max остаются для стрелок.
        */}
        <NumberInput
          label="Длительность, минут"
          min={1}
          max={1440}
          clampBehavior="none"
          allowDecimal={false}
          allowNegative={false}
          withAsterisk
          {...form.getInputProps('durationMinutes')}
          error={form.errors.durationMinutes ?? fieldErrors.durationMinutes}
        />

        {submitError && (
          <Alert color="red" variant="light" radius="md">
            {submitError}
          </Alert>
        )}

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onCancel} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Создать
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npm test -- src/features/admin/EventTypeForm.test.tsx`
Expected: PASS, шесть тестов.

- [ ] **Step 5: Прогнать всё и закоммитить**

Run: `npm test && npm run lint && npm run typecheck`
Expected: зелено.

```bash
git add src/features/admin/EventTypeForm.tsx src/features/admin/EventTypeForm.test.tsx
git commit -m "feat(admin): add event type creation form"
```

---

### Task 5: Вкладка «Типы встреч»

**Files:**
- Create: `frontend/src/features/admin/EventTypesAdmin.tsx`
- Test: `frontend/src/features/admin/EventTypesAdmin.test.tsx`

**Interfaces:**
- Consumes: `useEventTypes()`, `createEventType()`, `ApiError`, типы `EventType` и `CreateEventTypeRequest`, `<EventTypeForm />`, `renderUi`, `stubFetch`, фикстуры `INTRO_CALL`, `STRATEGY_SESSION`.
- Produces: `<EventTypesAdmin />` — без пропсов, грузит данные сама.

- [ ] **Step 1: Написать падающие тесты**

Создать `frontend/src/features/admin/EventTypesAdmin.test.tsx`:

```tsx
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { INTRO_CALL, STRATEGY_SESSION } from '../../test/fixtures';
import { renderUi } from '../../test/renderUi';
import { stubFetch } from '../../test/stubFetch';
import { EventTypesAdmin } from './EventTypesAdmin';

afterEach(() => {
  vi.unstubAllGlobals();
});

async function fillNewType(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Создать тип' }));
  await user.type(screen.getByLabelText(/Идентификатор/), 'strategy-session');
  await user.type(screen.getByLabelText(/Название/), 'Стратегическая сессия');
  await user.clear(screen.getByLabelText(/Длительность/));
  await user.type(screen.getByLabelText(/Длительность/), '90');
  await user.click(screen.getByRole('button', { name: 'Создать' }));
}

describe('EventTypesAdmin', () => {
  it('показывает существующие типы с идентификатором', async () => {
    stubFetch({ eventTypes: () => Response.json([INTRO_CALL]) });

    renderUi(<EventTypesAdmin />);

    expect(await screen.findByText('Знакомство')).toBeInTheDocument();
    expect(screen.getByText('intro-call')).toBeInTheDocument();
    expect(screen.getByText('30 мин')).toBeInTheDocument();
  });

  it('шлёт POST и дописывает созданный тип в список', async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch({
      eventTypes: () => Response.json([INTRO_CALL]),
      createEventType: () => Response.json(STRATEGY_SESSION, { status: 201 }),
    });

    renderUi(<EventTypesAdmin />);
    await fillNewType(user);

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some((call) => String(call[0]).endsWith('/admin/event-types')),
      ).toBe(true),
    );

    const call = fetchMock.mock.calls.find((item) =>
      String(item[0]).endsWith('/admin/event-types'),
    );
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({
      id: 'strategy-session',
      name: 'Стратегическая сессия',
      description: '',
      durationMinutes: 90,
    });

    expect(await screen.findByText('Тип встречи «Стратегическая сессия» создан.')).toBeInTheDocument();
    expect(screen.getByText('strategy-session')).toBeInTheDocument();
  });

  it('после 409 показывает ошибку под полем идентификатора', async () => {
    const user = userEvent.setup();
    stubFetch({
      eventTypes: () => Response.json([INTRO_CALL]),
      createEventType: () =>
        Response.json(
          {
            code: 'event_type_already_exists',
            message: 'Тип события с таким id уже существует.',
          },
          { status: 409 },
        ),
    });

    renderUi(<EventTypesAdmin />);
    await fillNewType(user);

    expect(await screen.findByText('Тип события с таким id уже существует.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Создать' })).toBeInTheDocument();
  });

  it('сообщает, что типов пока нет', async () => {
    stubFetch({ eventTypes: () => Response.json([]) });

    renderUi(<EventTypesAdmin />);

    expect(await screen.findByText('Типы встреч пока не созданы.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npm test -- src/features/admin/EventTypesAdmin.test.tsx`
Expected: FAIL — модуль `./EventTypesAdmin` не найден.

- [ ] **Step 3: Написать вкладку**

Создать `frontend/src/features/admin/EventTypesAdmin.tsx`:

```tsx
import { Alert, Badge, Button, Card, Group, Modal, Skeleton, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';

import { createEventType } from '../../shared/api/endpoints';
import { ApiError, type CreateEventTypeRequest, type EventType } from '../../shared/api/types';
import { useEventTypes } from '../../shared/api/useEventTypes';
import { EventTypeForm } from './EventTypeForm';

/**
 * Prism не хранит состояние: созданный тип не появится в `GET /event-types`,
 * поэтому он дописывается в список локально. На реальном бэкенде такой тип
 * придёт из ручки — дубликаты отсеиваются по `id`.
 */
function mergeById(loaded: EventType[], extra: EventType[]): EventType[] {
  return [...loaded, ...extra.filter((item) => !loaded.some((one) => one.id === item.id))];
}

function EventTypeRows({ eventTypes }: { eventTypes: EventType[] }) {
  if (eventTypes.length === 0) {
    return <Text c="dimmed">Типы встреч пока не созданы.</Text>;
  }

  return (
    <Stack gap="sm">
      {eventTypes.map((eventType) => (
        <Card key={eventType.id} withBorder radius="lg" padding="md">
          <Group gap="sm" wrap="nowrap" justify="space-between">
            <Text fw={600}>{eventType.name}</Text>
            <Group gap="xs" wrap="nowrap">
              <Badge variant="light" radius="sm">
                {eventType.durationMinutes} мин
              </Badge>
              <Badge variant="outline" radius="sm">
                {eventType.id}
              </Badge>
            </Group>
          </Group>

          {eventType.description && (
            <Text fz="sm" c="dimmed" mt={6}>
              {eventType.description}
            </Text>
          )}
        </Card>
      ))}
    </Stack>
  );
}

export function EventTypesAdmin() {
  const { data, isLoading, error, retry } = useEventTypes();
  const [created, setCreated] = useState<EventType[]>([]);
  const [lastCreated, setLastCreated] = useState<EventType | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<ApiError | null>(null);

  function openModal() {
    setSubmitError(null);
    setLastCreated(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  async function handleSubmit(values: CreateEventTypeRequest) {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const eventType = await createEventType(values);
      setCreated((current) => mergeById(current, [eventType]));
      setLastCreated(eventType);
      setModalOpen(false);
    } catch (cause) {
      setSubmitError(
        cause instanceof ApiError
          ? cause
          : new ApiError('unknown_error', 'Не удалось создать тип встречи', 0),
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Занятый `id` — это ошибка одного поля, а не всей формы: показываем её там,
  // где владелец может её исправить.
  const fieldErrors =
    submitError?.code === 'event_type_already_exists'
      ? { id: submitError.message }
      : Object.fromEntries(
          (submitError?.fieldErrors ?? []).map((item): [string, string] => [
            item.field,
            item.message,
          ]),
        );
  const generalSubmitError =
    submitError && submitError.code !== 'event_type_already_exists' ? submitError.message : null;

  return (
    <Stack gap="lg">
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Text c="dimmed" fz="sm">
          Типы встреч, доступные гостям.
        </Text>
        <Button leftSection={<IconPlus size={16} />} onClick={openModal}>
          Создать тип
        </Button>
      </Group>

      {lastCreated && (
        <Alert color="green" variant="light" radius="md" icon={<IconCheck size={20} />}>
          Тип встречи «{lastCreated.name}» создан.
        </Alert>
      )}

      {isLoading && (
        <Stack gap="sm">
          <Skeleton height={72} radius="lg" />
          <Skeleton height={72} radius="lg" />
        </Stack>
      )}

      {error && (
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
      )}

      {!isLoading && !error && <EventTypeRows eventTypes={mergeById(data ?? [], created)} />}

      <Modal opened={isModalOpen} onClose={closeModal} title="Новый тип встречи" radius="lg" centered>
        <EventTypeForm
          isSubmitting={isSubmitting}
          submitError={generalSubmitError}
          fieldErrors={fieldErrors}
          onSubmit={handleSubmit}
          onCancel={closeModal}
        />
      </Modal>
    </Stack>
  );
}
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npm test -- src/features/admin/EventTypesAdmin.test.tsx`
Expected: PASS, четыре теста.

- [ ] **Step 5: Прогнать всё и закоммитить**

Run: `npm test && npm run lint && npm run typecheck`
Expected: зелено.

```bash
git add src/features/admin/EventTypesAdmin.tsx src/features/admin/EventTypesAdmin.test.tsx
git commit -m "feat(admin): add event types tab with creation modal"
```

---

### Task 6: Страница админки с вкладками

**Files:**
- Modify: `frontend/src/pages/AdminPage.tsx`, `frontend/src/App.test.tsx`, `frontend/README.md`
- Test: `frontend/src/pages/AdminPage.test.tsx`

**Interfaces:**
- Consumes: `<UpcomingBookings />`, `<EventTypesAdmin />`, `useSearchParams` из `react-router`.
- Produces: маршрут `/admin` с параметром `?tab=event-types`; новых экспортов нет.

- [ ] **Step 1: Написать падающие тесты**

Создать `frontend/src/pages/AdminPage.test.tsx`:

```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { INTRO_CALL, upcomingBookingsFixture } from '../test/fixtures';
import { renderApp } from '../test/renderApp';
import { stubFetch } from '../test/stubFetch';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AdminPage', () => {
  it('по умолчанию открывает предстоящие встречи', async () => {
    stubFetch({ upcomingBookings: () => Response.json(upcomingBookingsFixture()) });

    renderApp('/admin');

    expect(screen.getByRole('heading', { name: 'Админка', level: 1 })).toBeInTheDocument();
    expect(await screen.findByText('Анна Петрова')).toBeInTheDocument();
  });

  it('по клику на вкладку показывает типы встреч', async () => {
    const user = userEvent.setup();
    stubFetch({
      upcomingBookings: () => Response.json([]),
      eventTypes: () => Response.json([INTRO_CALL]),
    });

    renderApp('/admin');
    await user.click(screen.getByRole('tab', { name: 'Типы встреч' }));

    expect(await screen.findByRole('button', { name: 'Создать тип' })).toBeInTheDocument();
    expect(await screen.findByText('intro-call')).toBeInTheDocument();
  });

  it('открывает вкладку типов встреч по параметру адреса', async () => {
    stubFetch({ eventTypes: () => Response.json([INTRO_CALL]) });

    renderApp('/admin?tab=event-types');

    expect(await screen.findByText('Знакомство')).toBeInTheDocument();
  });

  it('неизвестное значение параметра трактует как вкладку по умолчанию', async () => {
    stubFetch({ upcomingBookings: () => Response.json(upcomingBookingsFixture()) });

    renderApp('/admin?tab=nope');

    expect(await screen.findByText('Анна Петрова')).toBeInTheDocument();
  });
});
```

Третий и четвёртый тесты не задают лишних маршрутов намеренно: неактивная
вкладка не смонтирована и запрос не делает. Если `stubFetch` бросит «не знаю,
что ответить» — значит `keepMounted={false}` потерялся.

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npm test -- src/pages/AdminPage.test.tsx`
Expected: FAIL — на странице нет ролей `tab`, текст «Анна Петрова» не найден.

- [ ] **Step 3: Переписать страницу**

Заменить содержимое `frontend/src/pages/AdminPage.tsx` целиком:

```tsx
import { Container, Stack, Tabs, Title } from '@mantine/core';
import { useSearchParams } from 'react-router';

import { EventTypesAdmin } from '../features/admin/EventTypesAdmin';
import { UpcomingBookings } from '../features/admin/UpcomingBookings';

const UPCOMING_TAB = 'upcoming';
const EVENT_TYPES_TAB = 'event-types';

export function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Неизвестное значение параметра трактуется как вкладка по умолчанию.
  const activeTab = searchParams.get('tab') === EVENT_TYPES_TAB ? EVENT_TYPES_TAB : UPCOMING_TAB;

  function handleTabChange(value: string | null) {
    setSearchParams(value === EVENT_TYPES_TAB ? { tab: EVENT_TYPES_TAB } : {}, { replace: true });
  }

  return (
    <Container size="lg" py={{ base: 32, md: 64 }}>
      <Stack gap="lg">
        <Title order={1}>Админка</Title>

        {/* keepMounted={false}: иначе неактивная вкладка тоже сходила бы в API. */}
        <Tabs value={activeTab} onChange={handleTabChange} keepMounted={false}>
          <Tabs.List mb="lg">
            <Tabs.Tab value={UPCOMING_TAB}>Предстоящие встречи</Tabs.Tab>
            <Tabs.Tab value={EVENT_TYPES_TAB}>Типы встреч</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value={UPCOMING_TAB}>
            <UpcomingBookings />
          </Tabs.Panel>

          <Tabs.Panel value={EVENT_TYPES_TAB}>
            <EventTypesAdmin />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
```

- [ ] **Step 4: Поправить тест навигации**

В `frontend/src/App.test.tsx` заменить строку названия теста

```tsx
  it('по клику на «Админка» открывает страницу-заглушку админки', async () => {
```

на

```tsx
  it('по клику на «Админка» открывает админку', async () => {
```

Заглушки больше нет; `beforeEach` в этом файле отвечает `[]` на любой запрос,
поэтому вкладка встреч покажет пустое состояние — правки стаба не нужны.

- [ ] **Step 5: Убедиться, что тесты проходят**

Run: `npm test -- src/pages/AdminPage.test.tsx src/App.test.tsx`
Expected: PASS.

- [ ] **Step 6: Обновить README**

В `frontend/README.md` в разделе «Что реализовано» заменить строку

```markdown
- `/admin` — заглушка «Скоро».
```

на

```markdown
- `/admin` — админка: предстоящие встречи всех типов и создание типа встречи
  (вкладка запоминается в адресе: `/admin?tab=event-types`).
```

В разделе «Особенности работы с моком» добавить третьим пунктом списка:

```markdown
- `POST /admin/event-types` тоже отвечает фикстурой — «Стратегическая сессия»,
  90 минут — независимо от введённых данных, и созданный тип не попадает
  в `GET /event-types`. Поэтому админка дописывает ответ сервера в список
  локально: после перезагрузки страницы тип исчезнет.
```

- [ ] **Step 7: Полная проверка**

Run: `npm test && npm run lint && npm run typecheck && npm run build`
Expected: все тесты зелёные, линтер и типы чистые, сборка проходит.

- [ ] **Step 8: Проверка вручную против мока**

В первом терминале: `cd ../spec && npm run mock`
Во втором: `npm run dev`, открыть `http://localhost:5173/admin`.

Ожидаемо: вкладка «Предстоящие встречи» показывает три брони разных типов,
сгруппированные по дням; вкладка «Типы встреч» — три типа с идентификаторами;
кнопка «Создать тип» открывает модалку, отправка формы добавляет
«Стратегическую сессию» и показывает зелёный алерт; повторная отправка того же
`id` не задваивает строку. Адрес меняется на `/admin?tab=event-types`.

- [ ] **Step 9: Коммит**

```bash
git add src/pages/AdminPage.tsx src/pages/AdminPage.test.tsx src/App.test.tsx README.md
git commit -m "feat(admin): wire admin page tabs and document mock behaviour"
```

# E2E-тесты на Playwright — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Покрыть сквозным браузерным тестом путь «владелец создал тип встречи в админке → гость записался → бронь видна в предстоящих», плюс три негативных сценария: занятый слот, дубликат идентификатора типа встречи, неизвестный тип встречи.

**Architecture:** Новый самостоятельный пакет `e2e/` рядом с `spec/`, `frontend/`, `backend/`. `playwright.config.ts` сам поднимает два сервера: настоящий бэкенд FastAPI на порту 3000 и прод-сборку фронтенда через `vite preview` на 4173, собранную с `VITE_API_BASE_URL=http://localhost:3000/api`. Тесты ходят только через интерфейс; прямой HTTP-запрос используется ровно в одном месте — чтобы занять слот из-под гостя и смоделировать гонку. Переиспользуемые шаги вынесены в `e2e/fixtures/`, сценарии — в `e2e/tests/`.

**Tech Stack:** `@playwright/test`, TypeScript, chromium. Со стороны приложения — уже существующие FastAPI (`uv`) и Vite.

Дизайн: [2026-08-06-e2e-playwright-design.md](../specs/2026-08-06-e2e-playwright-design.md).

## Global Constraints

- Весь новый код живёт в `e2e/`. Файлы `frontend/`, `backend/`, `spec/` и `.github/` в этой задаче **не меняются** — ни строчки, включая `data-testid`.
- Все команды запускаются из каталога `e2e/`.
- Комментарии и названия тестов — по-русски, как в остальном репозитории. Строки не длиннее 100 символов.
- Локаторы только семантические: `getByRole`, `getByLabel`, `getByText`. `data-testid`, CSS-классы Mantine и XPath запрещены.
- `workers: 1`, `fullyParallel: false`. Хранилище бэкенда одно на прогон, а правило занятости не различает типы встреч: бронь на 10:00 закрывает 10:00 для любого типа.
- Каждый тест создаёт свой тип встречи с уникальным `id` из `uniqueEventTypeId()` и длительностью 30 минут. Идентификатор обязан подходить под контрактный шаблон `^[a-z0-9]+(-[a-z0-9]+)*$`.
- Тест никогда не задаёт время жёстко: слот всегда берётся как первый доступный в окне записи.
- Часовой пояс браузера пришпилен к UTC (`timezoneId: 'UTC'`), поэтому подпись кнопки слота — это символы 11–16 из `startAt`: `2026-08-06T10:00:00Z` → `10:00`.
- Разделитель в диапазоне времени — **длинное тире** `–` (U+2013) с обычными пробелами по бокам: `10:00 – 10:30`. Это то, что печатает `formatTimeRange` во фронтенде.
- Цикл «красный → зелёный» к этим тестам не применяется: приложение уже написано, и новый E2E-тест обязан проходить сразу. Вместо шага «убедиться, что тест падает» в задачах стоит проверка, что тест действительно что-то проверяет — сломать предусловие и увидеть падение.
- Стиль коммитов — как в репозитории: `test(e2e): ...`, `chore(e2e): ...`.

---

### Task 1: Пакет `e2e/`, конфигурация Playwright и сценарий «тип встречи не найден»

Первая задача заканчивается работающей командой `npm test`, которая сама поднимает бэкенд и фронтенд и прогоняет один настоящий сценарий — самый простой из четырёх, не требующий никаких хелперов, кроме генератора идентификаторов.

**Files:**
- Create: `e2e/package.json`
- Create: `e2e/tsconfig.json`
- Create: `e2e/.gitignore`
- Create: `e2e/playwright.config.ts`
- Create: `e2e/README.md`
- Create: `e2e/fixtures/ids.ts`
- Test: `e2e/tests/event-type-missing.spec.ts`

**Interfaces:**
- Consumes: ничего.
- Produces: модуль `e2e/fixtures/ids.ts` с функцией `uniqueEventTypeId(slug: string): string`; экспорты `baseURL: string` и `apiBaseURL: string` из `e2e/playwright.config.ts`.

- [ ] **Step 1: Создать `e2e/package.json`**

Без секции `devDependencies` — её заполнит `npm install` на следующем шаге, чтобы в файл попали актуальные версии, а не выдуманные.

```json
{
  "name": "booking-calendar-e2e",
  "version": "0.1.0",
  "private": true,
  "description": "Сквозные браузерные тесты календаря бронирования",
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "report": "playwright show-report",
    "typecheck": "tsc --noEmit"
  }
}
```

Поля `"type": "module"` здесь намеренно нет: Playwright транспилирует TypeScript в CommonJS, и в CJS-режиме импорты без расширений работают без дополнительной настройки.

- [ ] **Step 2: Установить зависимости и браузер**

```bash
cd e2e
npm install --save-dev @playwright/test @types/node typescript
npx playwright install chromium
```

Ожидается: в `e2e/package.json` появилась секция `devDependencies`, создан `e2e/package-lock.json`, chromium скачан.

- [ ] **Step 3: Создать `e2e/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "types": ["node"],
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["playwright.config.ts", "fixtures", "tests"]
}
```

- [ ] **Step 4: Создать `e2e/.gitignore`**

```gitignore
node_modules/
test-results/
playwright-report/
blob-report/
playwright/.cache/
```

- [ ] **Step 5: Создать `e2e/playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

const FRONTEND_PORT = 4173;
const BACKEND_PORT = 3000;

/** Адрес прод-сборки фронтенда: порт 4173 уже разрешён в CORS бэкенда. */
export const baseURL = `http://localhost:${FRONTEND_PORT}`;

/** Адрес бэкенда, с которым собирается фронтенд и куда ходит тестовый клиент. */
export const apiBaseURL = `http://localhost:${BACKEND_PORT}/api`;

export default defineConfig({
  testDir: './tests',

  // Хранилище бэкенда одно на весь прогон, а правило занятости не различает
  // типы встреч: параллельные тесты отбирали бы слоты друг у друга.
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL,
    // Бэкенд считает сетку слотов в UTC, фронтенд форматирует время в поясе
    // браузера. Без пина подписи слотов и заголовки дней зависели бы от машины,
    // а восточнее UTC+6 сегодняшние слоты уезжали бы на следующую дату.
    timezoneId: 'UTC',
    locale: 'ru-RU',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      command: `uv run uvicorn app.main:app --port ${BACKEND_PORT}`,
      cwd: '../backend',
      // Хранилище стартует пустым, поэтому ручка отдаёт 200 и `[]`.
      url: `${apiBaseURL}/event-types`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      // VITE_API_BASE_URL читается на этапе сборки, поэтому переменная задаётся
      // всей команде целиком, а не только `preview`. Файл frontend/.env при этом
      // не трогается: у разработчика там может быть адрес Prism-мока.
      command: `npm run build && npm run preview -- --port ${FRONTEND_PORT} --strictPort`,
      cwd: '../frontend',
      url: baseURL,
      env: { VITE_API_BASE_URL: apiBaseURL },
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
```

- [ ] **Step 6: Создать `e2e/fixtures/ids.ts`**

```ts
/**
 * Хранилище бэкенда живёт весь прогон, поэтому каждый тест работает со своим
 * типом встречи. Метка времени разводит прогоны между собой (сервер может быть
 * переиспользован), счётчик — тесты внутри одного прогона.
 *
 * Формат обязан подходить под контрактный шаблон `^[a-z0-9]+(-[a-z0-9]+)*$`.
 */
let counter = 0;

export function uniqueEventTypeId(slug: string): string {
  counter += 1;
  return `e2e-${slug}-${Date.now()}-${counter}`;
}
```

- [ ] **Step 7: Написать сценарий «тип встречи не найден»**

Создать `e2e/tests/event-type-missing.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

import { uniqueEventTypeId } from '../fixtures/ids';

test('запись на несуществующий тип встречи ведёт к списку типов', async ({ page }) => {
  await page.goto(`/booking/${uniqueEventTypeId('missing')}`);

  await expect(page.getByRole('heading', { name: 'Тип встречи не найден' })).toBeVisible();

  await page.getByRole('link', { name: 'Выбрать тип встречи' }).click();

  await expect(page).toHaveURL('/booking');
  await expect(page.getByRole('heading', { name: 'Записаться на встречу' })).toBeVisible();
});
```

Кнопка «Выбрать тип встречи» — это `Button component={Link}`, то есть в разметке `<a>`: искать её надо по роли `link`, а не `button`.

- [ ] **Step 8: Прогнать тест**

Run: `npm test`
Expected: PASS, 1 passed. Playwright сам собирает фронтенд и поднимает оба сервера — первый прогон занимает около минуты.

- [ ] **Step 9: Проверить, что тест не проходит вхолостую**

Временно поменять в тесте ожидаемый заголовок на `Тип встречи найден` и прогнать `npm test`.
Expected: FAIL по таймауту на `toBeVisible`. Вернуть текст обратно и прогнать ещё раз — PASS.

- [ ] **Step 10: Проверить типы**

Run: `npm run typecheck`
Expected: без ошибок.

- [ ] **Step 11: Создать `e2e/README.md`**

````markdown
# Сквозные тесты на Playwright

Проверяют путь «владелец создал тип встречи → гость записался → бронь видна
в админке» в настоящем браузере против настоящего бэкенда.
Дизайн: [docs/superpowers/specs/2026-08-06-e2e-playwright-design.md](../docs/superpowers/specs/2026-08-06-e2e-playwright-design.md).

## Что нужно на машине

- `uv` — им запускается бэкенд;
- зависимости фронтенда: `npm ci` в [../frontend](../frontend);
- зависимости и браузер здесь: `npm ci && npx playwright install chromium`.

## Запуск

```bash
npm test          # прогон целиком
npm run test:ui   # интерактивный режим
npm run report    # отчёт последнего прогона
```

Серверы поднимает сам Playwright: бэкенд на `http://localhost:3000`, прод-сборку
фронтенда на `http://localhost:4173`. Фронтенд собирается с
`VITE_API_BASE_URL=http://localhost:3000/api`, файл `frontend/.env` при этом не
трогается. Если серверы уже запущены вручную, они переиспользуются — кроме CI.

## Как устроены тесты

- `tests/` — сценарии, `fixtures/` — переиспользуемые шаги.
- Хранилище бэкенда живёт в памяти и одно на весь прогон, а пересечение броней
  запрещено независимо от типа встречи. Поэтому `workers: 1`, каждый тест
  создаёт свой тип встречи с уникальным `id` и всегда берёт **первый свободный**
  слот, а не конкретное время.
- Часовой пояс браузера пришпилен к UTC: иначе подписи слотов и группировка
  броней по дням зависели бы от машины.
- Локаторы только семантические — ролей, лейблов и текста хватает, `data-testid`
  в приложении не добавлялись.

## Известное ограничение

Тесты зависят от реальных часов: рабочее окно бэкенда — будни 10:00–18:00 UTC.
Прогон вечером в пятницу означает, что первый день со слотами — понедельник.
Логику это не ломает: конкретная дата нигде не проверяется.
````

- [ ] **Step 12: Коммит**

```bash
cd /Users/mikhail/projects/ai-for-developers-project-386
git add e2e
git commit -m "test(e2e): set up Playwright and cover the missing event type page"
```

---

### Task 2: Хелпер создания типа встречи и сценарий дубликата идентификатора

**Files:**
- Create: `e2e/fixtures/eventType.ts`
- Test: `e2e/tests/event-type-duplicate.spec.ts`

**Interfaces:**
- Consumes: `uniqueEventTypeId(slug: string): string` из `e2e/fixtures/ids.ts`.
- Produces: модуль `e2e/fixtures/eventType.ts` с интерфейсом `EventTypeValues { id: string; name: string; description: string; durationMinutes: number }` и функциями `openEventTypesTab(page: Page): Promise<void>`, `submitEventTypeForm(page: Page, values: EventTypeValues): Promise<void>`, `createEventType(page: Page, values: EventTypeValues): Promise<void>`.

- [ ] **Step 1: Создать `e2e/fixtures/eventType.ts`**

```ts
import { expect, type Page } from '@playwright/test';

export interface EventTypeValues {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
}

/** Открыть вкладку «Типы встреч» админки и дождаться, пока она отрисуется. */
export async function openEventTypesTab(page: Page): Promise<void> {
  await page.goto('/admin?tab=event-types');
  await expect(page.getByRole('button', { name: 'Создать тип' })).toBeVisible();
}

/**
 * Заполнить модалку «Новый тип встречи» и отправить форму. Результат не
 * проверяется: сценарий дубликата ждёт здесь ошибку, а не успех.
 */
export async function submitEventTypeForm(page: Page, values: EventTypeValues): Promise<void> {
  await page.getByRole('button', { name: 'Создать тип' }).click();

  const modal = page.getByRole('dialog');
  await expect(modal.getByText('Новый тип встречи')).toBeVisible();

  await modal.getByLabel('Идентификатор').fill(values.id);
  await modal.getByLabel('Название').fill(values.name);
  await modal.getByLabel('Описание').fill(values.description);

  // NumberInput у Mantine построен на react-number-format: проверяем, что
  // введённое значение действительно оказалось в поле, а не потерялось.
  const duration = modal.getByLabel('Длительность, минут');
  await duration.fill(String(values.durationMinutes));
  await expect(duration).toHaveValue(String(values.durationMinutes));

  // exact: иначе имя совпало бы и с кнопкой «Создать тип» под модалкой.
  await modal.getByRole('button', { name: 'Создать', exact: true }).click();
}

/** Создать тип встречи через админку и дождаться подтверждения. */
export async function createEventType(page: Page, values: EventTypeValues): Promise<void> {
  await submitEventTypeForm(page, values);

  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText(`Тип встречи «${values.name}» создан.`)).toBeVisible();
}
```

- [ ] **Step 2: Написать сценарий дубликата**

Создать `e2e/tests/event-type-duplicate.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

import { createEventType, openEventTypesTab, submitEventTypeForm } from '../fixtures/eventType';
import { uniqueEventTypeId } from '../fixtures/ids';

test('занятый идентификатор типа встречи показывает ошибку под полем', async ({ page }) => {
  const id = uniqueEventTypeId('duplicate');
  const values = {
    id,
    name: `Первый ${id}`,
    description: 'Занимает идентификатор.',
    durationMinutes: 30,
  };

  await openEventTypesTab(page);
  await createEventType(page, values);

  await submitEventTypeForm(page, { ...values, name: `Второй ${id}` });

  // Сообщение приходит от бэкенда с кодом event_type_already_exists и
  // показывается как ошибка поля «Идентификатор», а не всей формы.
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();
  await expect(modal.getByText('Тип события с таким id уже существует.')).toBeVisible();
});
```

- [ ] **Step 3: Прогнать сценарий**

Run: `npx playwright test tests/event-type-duplicate.spec.ts`
Expected: PASS, 1 passed.

- [ ] **Step 4: Проверить, что тест не проходит вхолостую**

Временно добавить во второй вызов `submitEventTypeForm` подмену идентификатора:

```ts
  await submitEventTypeForm(page, { ...values, id: uniqueEventTypeId('other'), name: 'Второй' });
```

С уникальным идентификатором конфликта быть не должно.

Run: `npx playwright test tests/event-type-duplicate.spec.ts`
Expected: FAIL — модалка закрылась, ошибки нет. Вернуть тест к исходному виду и прогнать снова — PASS.

- [ ] **Step 5: Прогнать всё и проверить типы**

Run: `npm test && npm run typecheck`
Expected: 2 passed, ошибок типов нет.

- [ ] **Step 6: Коммит**

```bash
cd /Users/mikhail/projects/ai-for-developers-project-386
git add e2e/fixtures/eventType.ts e2e/tests/event-type-duplicate.spec.ts
git commit -m "test(e2e): cover the duplicate event type id conflict"
```

---

### Task 3: Хелперы бронирования и сквозной сценарий

**Files:**
- Create: `e2e/fixtures/api.ts`
- Create: `e2e/fixtures/booking.ts`
- Test: `e2e/tests/full-flow.spec.ts`

**Interfaces:**
- Consumes: `uniqueEventTypeId` из `e2e/fixtures/ids.ts`; `EventTypeValues`, `openEventTypesTab`, `createEventType` из `e2e/fixtures/eventType.ts`.
- Produces:
  - `e2e/fixtures/api.ts`: константа `API_BASE_URL: string`; интерфейсы `Slot { startAt: string; endAt: string }`, `DayAvailability { date: string; slots: Slot[] }`, `Availability { eventTypeId: string; slotDurationMinutes: number; windowStartDate: string; windowEndDate: string; days: DayAvailability[] }`, `BookingInput { eventTypeId: string; startAt: string; guestName: string; guestEmail: string }`; функция `createBookingViaApi(request: APIRequestContext, input: BookingInput): Promise<void>`.
  - `e2e/fixtures/booking.ts`: интерфейс `GuestValues { name: string; email: string; comment: string }`; функции `waitForAvailability(page: Page, eventTypeId: string): Promise<Availability>`, `firstAvailableSlot(availability: Availability): Slot`, `slotLabel(slot: Slot): string`, `slotRangeLabel(slot: Slot): string`, `selectSlot(page: Page, slot: Slot): Promise<void>`, `fillGuestForm(page: Page, values: GuestValues): Promise<void>`, `submitGuestForm(page: Page): Promise<void>`.

- [ ] **Step 1: Создать `e2e/fixtures/api.ts`**

Типы описаны здесь заново, а не импортированы из `frontend/src/shared/api/types.ts`: пакет `e2e/` самостоятельный, и тянуть исходники фронтенда через границу пакета ради четырёх интерфейсов не стоит.

```ts
import { expect, type APIRequestContext } from '@playwright/test';

/** Тот же адрес, с которым playwright.config.ts собирает фронтенд. */
export const API_BASE_URL = 'http://localhost:3000/api';

export interface Slot {
  startAt: string;
  endAt: string;
}

export interface DayAvailability {
  date: string;
  slots: Slot[];
}

export interface Availability {
  eventTypeId: string;
  slotDurationMinutes: number;
  windowStartDate: string;
  windowEndDate: string;
  days: DayAvailability[];
}

export interface BookingInput {
  eventTypeId: string;
  startAt: string;
  guestName: string;
  guestEmail: string;
}

/**
 * Занять слот в обход интерфейса. Единственное место, где тест ходит в API
 * напрямую: так моделируется чужая бронь, появившаяся, пока гость заполнял
 * форму. Вторая вкладка браузера дала бы то же самое, но зависела бы от
 * таймингов рендера.
 */
export async function createBookingViaApi(
  request: APIRequestContext,
  input: BookingInput,
): Promise<void> {
  const response = await request.post(`${API_BASE_URL}/bookings`, { data: input });
  expect(response.status(), await response.text()).toBe(201);
}
```

- [ ] **Step 2: Создать `e2e/fixtures/booking.ts`**

```ts
import { type Page } from '@playwright/test';

import type { Availability, Slot } from './api';

/**
 * Ответ `GET /event-types/<id>/slots`, который получил сам интерфейс. Промис
 * надо создать до перехода на страницу записи: иначе ответ придёт раньше, чем
 * начнётся ожидание, и тест зависнет.
 */
export function waitForAvailability(page: Page, eventTypeId: string): Promise<Availability> {
  return page
    .waitForResponse(
      (response) =>
        response.url().includes(`/event-types/${eventTypeId}/slots`) && response.ok(),
    )
    .then((response) => response.json() as Promise<Availability>);
}

/**
 * Первый свободный слот в окне записи — ровно тот, который интерфейс открывает
 * по умолчанию. Фиксированное время брать нельзя: брони предыдущих тестов
 * закрывают слоты независимо от типа встречи.
 */
export function firstAvailableSlot(availability: Availability): Slot {
  const day = availability.days.find((item) => item.slots.length > 0);

  if (!day) {
    throw new Error(
      `В окне ${availability.windowStartDate}…${availability.windowEndDate} нет свободных слотов`,
    );
  }

  return day.slots[0];
}

/** Подпись кнопки слота: с `timezoneId: 'UTC'` это часы и минуты из `startAt`. */
export function slotLabel(slot: Slot): string {
  return slot.startAt.slice(11, 16);
}

/** `10:00 – 10:30` — так время брони печатают экран подтверждения и админка. */
export function slotRangeLabel(slot: Slot): string {
  return `${slotLabel(slot)} – ${slot.endAt.slice(11, 16)}`;
}

export async function selectSlot(page: Page, slot: Slot): Promise<void> {
  await page
    .getByRole('group', { name: 'Свободные слоты' })
    .getByRole('button', { name: slotLabel(slot), exact: true })
    .click();
}

export interface GuestValues {
  name: string;
  email: string;
  comment: string;
}

export async function fillGuestForm(page: Page, values: GuestValues): Promise<void> {
  await page.getByLabel('Имя').fill(values.name);
  await page.getByLabel('Email').fill(values.email);
  await page.getByLabel('Комментарий').fill(values.comment);
}

/** В шапке есть ссылка «Записаться», поэтому кнопку ищем именно по роли. */
export async function submitGuestForm(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Записаться', exact: true }).click();
}
```

- [ ] **Step 3: Написать сквозной сценарий**

Создать `e2e/tests/full-flow.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

import {
  fillGuestForm,
  firstAvailableSlot,
  selectSlot,
  slotRangeLabel,
  submitGuestForm,
  waitForAvailability,
} from '../fixtures/booking';
import { createEventType, openEventTypesTab } from '../fixtures/eventType';
import { uniqueEventTypeId } from '../fixtures/ids';

test('владелец создаёт тип встречи, гость записывается, бронь видна в админке', async ({
  page,
}) => {
  const id = uniqueEventTypeId('flow');
  const eventType = {
    id,
    name: `Знакомство ${id}`,
    description: 'Короткий созвон, чтобы познакомиться.',
    durationMinutes: 30,
  };
  const guest = {
    name: `Гость ${id}`,
    email: `guest-${id}@example.com`,
    comment: 'Хочу обсудить сотрудничество.',
  };

  await test.step('владелец создаёт тип встречи', async () => {
    await openEventTypesTab(page);
    await createEventType(page, eventType);

    // Перезагрузка доказывает, что тип сохранился на сервере: список админки
    // дописывает только что созданный тип ещё и в локальное состояние.
    await page.reload();
    await expect(page.getByText(eventType.name)).toBeVisible();
  });

  const slot = await test.step('гость открывает страницу записи', async () => {
    await page.goto('/booking');

    const card = page.getByRole('link', { name: eventType.name });
    await expect(card).toBeVisible();

    const availability = waitForAvailability(page, id);
    await card.click();

    await expect(page.getByRole('heading', { name: eventType.name })).toBeVisible();
    return firstAvailableSlot(await availability);
  });

  await test.step('гость выбирает слот и отправляет форму', async () => {
    await selectSlot(page, slot);
    await fillGuestForm(page, guest);
    await submitGuestForm(page);
  });

  await test.step('гость видит подтверждение', async () => {
    await expect(page.getByRole('heading', { name: 'Вы записаны' })).toBeVisible();
    await expect(page.getByText(`${eventType.name} · ${eventType.durationMinutes} мин`)).toBeVisible();
    // Экран подтверждения печатает длинную дату и время окончания через тире,
    // поэтому `10:00 – 10:30` — это хвост строки; длинную дату не проверяем,
    // её формат задаёт ICU и он меняется от версии к версии.
    await expect(page.getByText(slotRangeLabel(slot))).toBeVisible();
    await expect(page.getByText(guest.name)).toBeVisible();
    await expect(page.getByText(guest.email)).toBeVisible();
    await expect(page.getByText(guest.comment)).toBeVisible();
  });

  await test.step('бронь появилась в предстоящих встречах', async () => {
    await page.goto('/admin');

    await expect(page.getByText(`${eventType.name} · ${eventType.durationMinutes} мин`)).toBeVisible();
    await expect(page.getByText(guest.name)).toBeVisible();
    await expect(page.getByRole('link', { name: guest.email })).toBeVisible();
  });
});
```

Почему `getByRole('link', ...)` для email в админке: `BookingCard` печатает его как `Anchor href="mailto:..."`, то есть ссылку.

Почему в админке не проверяется время брони: `10:00 – 10:30` не уникально. В списке предстоящих лежат брони всех тестов прогона, а если сервер переиспользован — и предыдущих прогонов; одинаковая подпись дала бы strict mode violation. Уникальны здесь только имя гостя, его email и название типа встречи — в них зашит идентификатор теста.

- [ ] **Step 4: Прогнать сквозной сценарий**

Run: `npx playwright test tests/full-flow.spec.ts`
Expected: PASS, 1 passed.

- [ ] **Step 5: Проверить, что проверка админки не проходит вхолостую**

Временно поменять в последнем `test.step` ожидание имени гостя на `page.getByText('Гость, которого не было')` и прогнать сценарий.
Expected: FAIL по таймауту. Вернуть исходное ожидание и прогнать снова — PASS.

- [ ] **Step 6: Прогнать всё и проверить типы**

Run: `npm test && npm run typecheck`
Expected: 3 passed, ошибок типов нет.

- [ ] **Step 7: Коммит**

```bash
cd /Users/mikhail/projects/ai-for-developers-project-386
git add e2e/fixtures/api.ts e2e/fixtures/booking.ts e2e/tests/full-flow.spec.ts
git commit -m "test(e2e): cover the full path from event type creation to booking"
```

---

### Task 4: Сценарий гонки за слот

**Files:**
- Test: `e2e/tests/slot-conflict.spec.ts`

**Interfaces:**
- Consumes: `createBookingViaApi` из `e2e/fixtures/api.ts`; `waitForAvailability`, `firstAvailableSlot`, `slotLabel`, `selectSlot`, `fillGuestForm`, `submitGuestForm` из `e2e/fixtures/booking.ts`; `createEventType`, `openEventTypesTab` из `e2e/fixtures/eventType.ts`; `uniqueEventTypeId` из `e2e/fixtures/ids.ts`.
- Produces: ничего — это последний сценарий.

- [ ] **Step 1: Написать сценарий гонки**

Создать `e2e/tests/slot-conflict.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

import { createBookingViaApi } from '../fixtures/api';
import {
  fillGuestForm,
  firstAvailableSlot,
  selectSlot,
  slotLabel,
  submitGuestForm,
  waitForAvailability,
} from '../fixtures/booking';
import { createEventType, openEventTypesTab } from '../fixtures/eventType';
import { uniqueEventTypeId } from '../fixtures/ids';

test('слот, занятый во время заполнения формы, показывает предупреждение', async ({
  page,
  request,
}) => {
  const id = uniqueEventTypeId('conflict');
  const eventType = {
    id,
    name: `Консультация ${id}`,
    description: 'Проверка гонки за слот.',
    durationMinutes: 30,
  };

  await openEventTypesTab(page);
  await createEventType(page, eventType);

  const availability = waitForAvailability(page, id);
  await page.goto(`/booking/${id}`);
  const slot = firstAvailableSlot(await availability);

  await selectSlot(page, slot);
  await fillGuestForm(page, {
    name: `Опоздавший ${id}`,
    email: `late-${id}@example.com`,
    comment: 'Успею ли я.',
  });

  // Пока гость заполнял форму, слот занял кто-то другой.
  await createBookingViaApi(request, {
    eventTypeId: id,
    startAt: slot.startAt,
    guestName: `Быстрый ${id}`,
    guestEmail: `fast-${id}@example.com`,
  });

  // На 409 фронтенд сбрасывает выбор и перезапрашивает свободное время:
  // дожидаемся именно этого ответа, иначе проверка сетки гонится с загрузкой.
  const refreshed = waitForAvailability(page, id);
  await submitGuestForm(page);
  await refreshed;

  await expect(page.getByText('Это время уже заняли, выберите другое.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Записаться', exact: true })).toBeHidden();
  await expect(
    page
      .getByRole('group', { name: 'Свободные слоты' })
      .getByRole('button', { name: slotLabel(slot), exact: true }),
  ).toBeHidden();
});
```

- [ ] **Step 2: Прогнать сценарий**

Run: `npx playwright test tests/slot-conflict.spec.ts`
Expected: PASS, 1 passed.

- [ ] **Step 3: Проверить, что тест не проходит вхолостую**

Временно закомментировать вызов `createBookingViaApi` вместе с ожиданием `refreshed` (иначе тест повиснет на ответе, которого не будет) и прогнать сценарий.
Expected: FAIL — вместо предупреждения появился экран «Вы записаны». Вернуть тест к исходному виду и прогнать снова — PASS.

- [ ] **Step 4: Прогнать весь набор дважды против одного и того же бэкенда**

`npm test && npm test` этого не доказывает: `webServer`, поднятый самим Playwright,
гасится в конце прогона, поэтому второй запуск получает свежее пустое хранилище.
Бэкенд надо поднять руками и оставить жить между прогонами.

```bash
cd backend && uv run uvicorn app.main:app --port 3000   # отдельный терминал
cd e2e && npm test
curl http://localhost:3000/api/event-types
curl http://localhost:3000/api/admin/bookings/upcoming
cd e2e && npm test
```

С `reuseExistingServer: !process.env.CI` Playwright цепляется к уже запущенному
процессу вместо своего — это видно по отсутствию строки `Started server process`
в логе прогона.

Expected: оба прогона 4 passed, PID бэкенда между ними не меняется, `curl` между
прогонами показывает непустое хранилище. Наблюдалось: типов встреч стало 3 → 6,
броней 2 → 4 — тесты переживают накопленное состояние.

- [ ] **Step 5: Проверить типы и итоговое состояние репозитория**

Run: `npm run typecheck`
Expected: без ошибок.

Run: `cd /Users/mikhail/projects/ai-for-developers-project-386 && git status --short`
Expected: среди изменений нет ни одного файла из `frontend/`, `backend/`, `spec/` или `.github/`.

- [ ] **Step 6: Коммит**

```bash
cd /Users/mikhail/projects/ai-for-developers-project-386
git add e2e/tests/slot-conflict.spec.ts
git commit -m "test(e2e): cover losing the slot while filling the guest form"
```

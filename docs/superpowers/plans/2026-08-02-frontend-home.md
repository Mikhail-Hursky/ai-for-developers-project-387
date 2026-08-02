# Фронтенд: главный экран и каркас приложения — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Поднять React-приложение `frontend/` с полностью реализованной главной страницей, каркасом роутинга и страницами-заглушками `/booking` и `/admin`, работающее против Prism-мока на `http://localhost:4010`.

**Architecture:** Отдельный npm-пакет `frontend/` рядом со `spec/`. Vite собирает React-приложение, Mantine отвечает за UI и тему, React Router — за навигацию без перезагрузки. Данные типов встреч тянутся из мока тонкой обёрткой над `fetch` плюс хук с состояниями загрузки/ошибки/повтора; библиотеку серверного состояния не подключаем. Каждая секция главной — отдельный компонент, не знающий о соседях.

**Tech Stack:** Vite 8, React 19, TypeScript 5 (strict), Mantine 9, React Router 7, Vitest 4 + Testing Library, ESLint 10.

## Global Constraints

- Все файлы проекта живут в каталоге `frontend/` в корне репозитория. Ничего за его пределами не меняем; `.github/workflows/hexlet-check.yml` не трогаем.
- Точные версии зависимостей (`package.json`, dependencies): `react@^19.2.8`, `react-dom@^19.2.8`, `react-router@^7.18.2`, `@mantine/core@^9.5.1`, `@mantine/hooks@^9.5.1`, `@tabler/icons-react@^3.46.0`.
- devDependencies: `vite@^8.2.0`, `@vitejs/plugin-react@^6.0.5`, `typescript@^5.9.3`, `@types/react@^19`, `@types/react-dom@^19`, `vitest@^4.1.10`, `jsdom@^29.1.1` (30.x требует Node ≥ 24.15, локально 24.11), `@testing-library/react@^16.3.2`, `@testing-library/dom@^10`, `@testing-library/jest-dom@^7.0.0`, `@testing-library/user-event@^14.6.1`, `postcss@^8`, `postcss-preset-mantine@^1.18.0`, `postcss-simple-vars@^7`, `eslint@^10.8.0`, `@eslint/js@^10.0.1`, `typescript-eslint@^8.65.0`, `eslint-plugin-react-hooks@^7.1.1`, `eslint-plugin-react-refresh@^0.5.3`, `globals@^17.9.0`.
- TypeScript strict: `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`. Никаких `any` и `@ts-ignore`.
- Весь пользовательский текст — на русском, ровно теми формулировками, что указаны в шагах. Кнопка админки называется «Админка», кнопка записи — «Записаться».
- Адрес API читается только из `import.meta.env.VITE_API_BASE_URL`. Пустое значение — исключение при инициализации клиента с внятным сообщением.
- Тёмную тему, переключатель темы, прокси в `vite.config.ts`, `react-query` и генерацию типов из OpenAPI не делаем.
- Импорты React Router — из пакета `react-router` (в v7 `react-router-dom` не нужен).
- Vitest без `globals`: `describe`/`it`/`expect`/`vi` импортируются явно из `vitest`.
- Коммиты — на английском, в формате Conventional Commits, после каждой задачи.

## Файловая структура

| Файл | Ответственность |
|---|---|
| `frontend/package.json` | Зависимости и скрипты `dev`, `build`, `preview`, `test`, `lint`, `typecheck` |
| `frontend/.env` | `VITE_API_BASE_URL=http://localhost:4010` (в git) |
| `frontend/.gitignore` | `node_modules`, `dist`, `.env.local` |
| `frontend/index.html` | Точка входа Vite, `lang="ru"`, `<div id="root">` |
| `frontend/vite.config.ts` | Плагин react + секция `test` (jsdom, setup-файл) |
| `frontend/tsconfig.json` | Единственный tsconfig, strict, `noEmit` |
| `frontend/postcss.config.cjs` | `postcss-preset-mantine` + брейкпоинты |
| `frontend/eslint.config.js` | Flat-конфиг ESLint |
| `frontend/README.md` | Порядок запуска мока и dev-сервера |
| `frontend/src/main.tsx` | Импорты стилей, `MantineProvider`, `BrowserRouter` |
| `frontend/src/App.tsx` | Определение маршрутов |
| `frontend/src/index.css` | Фон страницы |
| `frontend/src/theme.ts` | Тема Mantine: палитра `brand`, шрифты, радиусы |
| `frontend/src/vite-env.d.ts` | Типизация `ImportMetaEnv` |
| `frontend/src/layout/RootLayout.tsx` | `Header` + `<Outlet />` |
| `frontend/src/layout/Header.tsx` | Логотип и навигация |
| `frontend/src/layout/Header.module.css` | Прилипание, размытие, граница шапки |
| `frontend/src/pages/HomePage.tsx` | Сборка секций главной |
| `frontend/src/pages/BookingPage.tsx` | Заглушка «Скоро» |
| `frontend/src/pages/AdminPage.tsx` | Заглушка «Скоро» |
| `frontend/src/features/home/Hero.tsx` | Бейдж, заголовок, подзаголовок, CTA |
| `frontend/src/features/home/Hero.module.css` | Градиент зоны hero |
| `frontend/src/features/home/SlotPreview.tsx` | Декоративная карточка со слотами |
| `frontend/src/features/home/SlotPreview.module.css` | Пилюли слотов |
| `frontend/src/features/home/EventTypes.tsx` | Типы встреч из API, четыре состояния |
| `frontend/src/features/home/Features.tsx` | Три карточки возможностей |
| `frontend/src/shared/api/types.ts` | `EventType`, `Slot`, `Availability`, `Booking`, `ApiError` |
| `frontend/src/shared/api/client.ts` | Обёртка над `fetch` |
| `frontend/src/shared/api/useEventTypes.ts` | Хук загрузки списка типов |
| `frontend/src/test/setup.ts` | jest-dom, `cleanup`, заглушки `matchMedia`/`ResizeObserver` |
| `frontend/src/test/renderApp.tsx` | Рендер `App` в провайдерах для тестов |

---

### Task 1: Каркас приложения, шапка и навигация

Задача поднимает пакет `frontend/` целиком (сборка, линтер, тесты, тема) и доводит до работающего каркаса: прилипающая шапка, три маршрута, переходы без перезагрузки. Настройка тулинга входит в эту задачу, потому что без неё каркас не проверить.

**Files:**
- Create: `frontend/package.json`, `frontend/.gitignore`, `frontend/.env`, `frontend/index.html`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/postcss.config.cjs`, `frontend/eslint.config.js`
- Create: `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/index.css`, `frontend/src/theme.ts`, `frontend/src/vite-env.d.ts`
- Create: `frontend/src/layout/RootLayout.tsx`, `frontend/src/layout/Header.tsx`, `frontend/src/layout/Header.module.css`
- Create: `frontend/src/pages/HomePage.tsx`, `frontend/src/pages/BookingPage.tsx`, `frontend/src/pages/AdminPage.tsx`
- Create: `frontend/src/test/setup.ts`, `frontend/src/test/renderApp.tsx`
- Test: `frontend/src/layout/Header.test.tsx`, `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: ничего.
- Produces: `theme: MantineTheme` из `src/theme.ts`; `App: () => JSX.Element` из `src/App.tsx`; `RootLayout`, `Header` из `src/layout/`; `HomePage`, `BookingPage`, `AdminPage` из `src/pages/`; `renderApp(initialPath?: string): RenderResult` из `src/test/renderApp.tsx`.

- [ ] **Step 1: Создать пакет и поставить зависимости**

```bash
mkdir -p frontend/src/{layout,pages,features/home,shared/api,test}
cd frontend
npm init -y
npm pkg set name=booking-calendar-frontend private=true type=module version=0.1.0
npm pkg delete main
npm pkg set scripts.dev=vite
npm pkg set scripts.build="tsc --noEmit && vite build"
npm pkg set scripts.preview=vite\ preview
npm pkg set scripts.test="vitest run"
npm pkg set scripts.test:watch=vitest
npm pkg set scripts.lint="eslint ."
npm pkg set scripts.typecheck="tsc --noEmit"
npm i react@^19.2.8 react-dom@^19.2.8 react-router@^7.18.2 @mantine/core@^9.5.1 @mantine/hooks@^9.5.1 @tabler/icons-react@^3.46.0
npm i -D vite@^8.2.0 @vitejs/plugin-react@^6.0.5 typescript@^5.9.3 @types/react@^19 @types/react-dom@^19 vitest@^4.1.10 jsdom@^30.0.1 @testing-library/react@^16.3.2 @testing-library/dom@^10 @testing-library/jest-dom@^7.0.0 @testing-library/user-event@^14.6.1 postcss@^8 postcss-preset-mantine@^1.18.0 postcss-simple-vars@^7 eslint@^10.8.0 @eslint/js@^10.8.0 typescript-eslint@^8.65.0 eslint-plugin-react-hooks@^7.1.1 eslint-plugin-react-refresh@^0.5.3 globals@^17.9.0
```

- [ ] **Step 2: Создать конфигурационные файлы**

`frontend/.gitignore`:

```gitignore
node_modules
dist
.env.local
*.local
```

`frontend/.env`:

```dotenv
# Адрес мок-сервера Prism (spec/npm run mock). Не секрет, поэтому лежит в git.
VITE_API_BASE_URL=http://localhost:4010
```

`frontend/index.html`:

```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Calendar — запись на встречу</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`frontend/postcss.config.cjs`:

```js
module.exports = {
  plugins: {
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em',
      },
    },
  },
};
```

`frontend/vite.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
  },
});
```

`frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "vite.config.ts"]
}
```

`frontend/eslint.config.js`:

```js
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },
);
```

`frontend/src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

`frontend/src/index.css`:

```css
body {
  background-color: var(--mantine-color-gray-0);
  color: var(--mantine-color-black);
}
```

- [ ] **Step 3: Написать тему и заготовки тестового окружения**

`frontend/src/theme.ts`:

```ts
import { createTheme, type MantineColorsTuple } from '@mantine/core';

const brand: MantineColorsTuple = [
  '#fff4e6',
  '#ffe8cc',
  '#ffd8a8',
  '#ffc078',
  '#ffa94d',
  '#ff922b',
  '#fd7e14',
  '#f76707',
  '#e8590c',
  '#d9480f',
];

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: 6,
  colors: { brand },
  black: '#1a1b1e',
  defaultRadius: 'md',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  headings: { fontWeight: '800' },
});
```

`frontend/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(cleanup);

// jsdom не реализует API, на которые опирается Mantine.
window.matchMedia = (query: string): MediaQueryList =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverStub;
```

`frontend/src/test/renderApp.tsx`:

```tsx
import { MantineProvider } from '@mantine/core';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import { App } from '../App';
import { theme } from '../theme';

export function renderApp(initialPath = '/'): RenderResult {
  return render(
    <MantineProvider theme={theme} env="test">
      <MemoryRouter initialEntries={[initialPath]}>
        <App />
      </MemoryRouter>
    </MantineProvider>,
  );
}
```

- [ ] **Step 4: Написать падающие тесты шапки и навигации**

`frontend/src/layout/Header.test.tsx`:

Ссылок с текстом «Записаться» на главной будет две (шапка и CTA в hero),
поэтому поиск идёт внутри `banner`:

```tsx
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderApp } from '../test/renderApp';

describe('Header', () => {
  it('показывает ссылки «Записаться» и «Админка»', () => {
    renderApp();

    const header = screen.getByRole('banner');
    expect(within(header).getByRole('link', { name: 'Записаться' })).toHaveAttribute(
      'href',
      '/booking',
    );
    expect(within(header).getByRole('link', { name: 'Админка' })).toHaveAttribute(
      'href',
      '/admin',
    );
  });

  it('ведёт логотипом на главную', () => {
    renderApp();

    expect(screen.getByRole('link', { name: /Calendar/ })).toHaveAttribute('href', '/');
  });
});
```

`frontend/src/App.test.tsx`:

```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderApp } from './test/renderApp';

describe('Навигация', () => {
  it('по клику на «Админка» открывает страницу-заглушку админки', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('link', { name: 'Админка' }));

    expect(screen.getByRole('heading', { name: 'Админка', level: 1 })).toBeInTheDocument();
  });

  it('неизвестный путь перенаправляет на главную', () => {
    renderApp('/no-such-page');

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Запись на встречу');
  });
});
```

- [ ] **Step 5: Убедиться, что тесты падают**

Run: `cd frontend && npm test`
Expected: FAIL — модули `./App`, `./layout/Header` не найдены.

- [ ] **Step 6: Реализовать шапку, layout и страницы**

`frontend/src/layout/Header.module.css`:

```css
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--mantine-color-gray-2);
}

.inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  gap: var(--mantine-spacing-sm);
}

.logo {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--mantine-color-black);
  text-decoration: none;
}

@media (max-width: $mantine-breakpoint-xs) {
  .inner {
    height: 56px;
  }
}
```

`frontend/src/layout/Header.tsx`:

```tsx
import { Anchor, Button, Container, Group, Text } from '@mantine/core';
import { IconCalendarWeek } from '@tabler/icons-react';
import { Link } from 'react-router';

import classes from './Header.module.css';

export function Header() {
  return (
    <header className={classes.header}>
      <Container size="lg" className={classes.inner}>
        <Link to="/" className={classes.logo}>
          <IconCalendarWeek size={24} stroke={1.8} aria-hidden />
          <Text fw={700} fz="lg">
            Calendar
          </Text>
        </Link>

        <Group gap="sm" wrap="nowrap">
          <Anchor component={Link} to="/booking" c="dark" fw={500} underline="never" fz="sm">
            Записаться
          </Anchor>
          <Button component={Link} to="/admin" variant="outline" size="sm">
            Админка
          </Button>
        </Group>
      </Container>
    </header>
  );
}
```

`frontend/src/layout/RootLayout.tsx`:

```tsx
import { Box } from '@mantine/core';
import { Outlet } from 'react-router';

import { Header } from './Header';

export function RootLayout() {
  return (
    <>
      <Header />
      <Box component="main">
        <Outlet />
      </Box>
    </>
  );
}
```

`frontend/src/pages/HomePage.tsx` (временная версия, финальную соберём в задачах 3–4):

```tsx
import { Container, Title } from '@mantine/core';

export function HomePage() {
  return (
    <Container size="lg" py={80}>
      <Title order={1}>Запись на встречу за пару кликов</Title>
    </Container>
  );
}
```

`frontend/src/pages/BookingPage.tsx`:

```tsx
import { Container, Stack, Text, Title } from '@mantine/core';

export function BookingPage() {
  return (
    <Container size="lg" py={80}>
      <Stack gap="xs" align="flex-start">
        <Title order={1}>Бронирование</Title>
        <Text c="dimmed">Скоро: выбор дня, времени и подтверждение записи.</Text>
      </Stack>
    </Container>
  );
}
```

`frontend/src/pages/AdminPage.tsx`:

```tsx
import { Container, Stack, Text, Title } from '@mantine/core';

export function AdminPage() {
  return (
    <Container size="lg" py={80}>
      <Stack gap="xs" align="flex-start">
        <Title order={1}>Админка</Title>
        <Text c="dimmed">Скоро: управление типами встреч и список предстоящих записей.</Text>
      </Stack>
    </Container>
  );
}
```

`frontend/src/App.tsx`:

```tsx
import { Navigate, Route, Routes } from 'react-router';

import { RootLayout } from './layout/RootLayout';
import { AdminPage } from './pages/AdminPage';
import { BookingPage } from './pages/BookingPage';
import { HomePage } from './pages/HomePage';

export function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="booking" element={<BookingPage />} />
        <Route path="booking/:eventTypeId" element={<BookingPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
```

`frontend/src/main.tsx`:

```tsx
import '@mantine/core/styles.css';
import './index.css';

import { MantineProvider } from '@mantine/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import { App } from './App';
import { theme } from './theme';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Не найден элемент #root в index.html');
}

createRoot(container).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MantineProvider>
  </StrictMode>,
);
```

- [ ] **Step 7: Прогнать тесты, типы, линтер и сборку**

Run: `cd frontend && npm test && npm run typecheck && npm run lint && npm run build`
Expected: 4 теста PASS, `tsc` и `eslint` без ошибок, `vite build` собирает `dist/`.

- [ ] **Step 8: Коммит**

```bash
git add frontend
git commit -m "feat(frontend): scaffold app shell with header and routing"
```

---

### Task 2: Слой работы с API

**Files:**
- Create: `frontend/src/shared/api/types.ts`, `frontend/src/shared/api/client.ts`, `frontend/src/shared/api/useEventTypes.ts`
- Test: `frontend/src/shared/api/client.test.ts`, `frontend/src/shared/api/useEventTypes.test.ts`

**Interfaces:**
- Consumes: тестовое окружение из задачи 1 (`src/test/setup.ts`), переменная `VITE_API_BASE_URL` из `frontend/.env`.
- Produces:
  - `interface EventType { id: string; name: string; description: string; durationMinutes: number }`
  - `interface Slot { startAt: string; endAt: string }`
  - `interface DayAvailability { date: string; slots: Slot[] }`
  - `interface Availability { eventTypeId: string; slotDurationMinutes: number; windowStartDate: string; windowEndDate: string; days: DayAvailability[] }`
  - `interface Booking { id: string; eventType: EventType; startAt: string; endAt: string; guestName: string; guestEmail: string; comment?: string; createdAt: string }`
  - `class ApiError extends Error { code: ApiErrorCode; status: number; fieldErrors?: FieldError[] }`
  - `apiGet<T>(path: string, init?: RequestInit): Promise<T>` и `apiBaseUrl: string` из `client.ts`
  - `useEventTypes(): { data: EventType[] | null; isLoading: boolean; error: ApiError | null; retry: () => void }`

- [ ] **Step 1: Написать падающий тест клиента**

`frontend/src/shared/api/client.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiBaseUrl, apiGet } from './client';
import { ApiError } from './types';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiGet', () => {
  it('подставляет базовый URL и возвращает разобранный JSON', async () => {
    const fetchMock = vi.fn(async () => Response.json([{ id: 'intro-call' }]));
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiGet<Array<{ id: string }>>('/event-types');

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${apiBaseUrl}/event-types`);
    expect(result).toEqual([{ id: 'intro-call' }]);
  });

  it('поднимает ApiError с кодом и сообщением из тела ответа', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ code: 'not_found', message: 'Тип события не найден' }, { status: 404 }),
      ),
    );

    const error = await apiGet('/event-types/nope').catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: 'not_found',
      message: 'Тип события не найден',
      status: 404,
    });
  });

  it('поднимает ApiError с кодом network_error, когда fetch упал', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );

    const error = await apiGet('/event-types').catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('network_error');
  });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `cd frontend && npx vitest run src/shared/api/client.test.ts`
Expected: FAIL — `Failed to resolve import "./client"`.

- [ ] **Step 3: Реализовать типы и клиент**

`frontend/src/shared/api/types.ts`:

```ts
/** Типы описаны вручную по spec/main.tsp. Даты — строки ISO-8601 в UTC. */

export interface EventType {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
}

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

export interface Booking {
  id: string;
  eventType: EventType;
  startAt: string;
  endAt: string;
  guestName: string;
  guestEmail: string;
  comment?: string;
  createdAt: string;
}

export interface FieldError {
  field: string;
  message: string;
}

export type ApiErrorCode =
  | 'not_found'
  | 'slot_already_booked'
  | 'event_type_already_exists'
  | 'validation_failed'
  | 'network_error'
  | 'unknown_error';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly fieldErrors?: FieldError[];

  constructor(code: ApiErrorCode, message: string, status: number, fieldErrors?: FieldError[]) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}
```

`frontend/src/shared/api/client.ts`:

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

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...init?.headers },
    });
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
```

- [ ] **Step 4: Проверить, что тесты клиента проходят**

Run: `cd frontend && npx vitest run src/shared/api/client.test.ts`
Expected: 3 теста PASS.

- [ ] **Step 5: Написать падающий тест хука**

`frontend/src/shared/api/useEventTypes.test.ts`:

```ts
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EventType } from './types';
import { useEventTypes } from './useEventTypes';

const introCall: EventType = {
  id: 'intro-call',
  name: 'Знакомство',
  description: 'Короткий созвон',
  durationMinutes: 30,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useEventTypes', () => {
  it('загружает список при монтировании', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json([introCall])));

    const { result } = renderHook(() => useEventTypes());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([introCall]);
    expect(result.current.error).toBeNull();
  });

  it('кладёт ошибку в error и повторяет запрос по retry', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ code: 'unknown_error', message: 'Сбой' }, { status: 500 }))
      .mockResolvedValueOnce(Response.json([introCall]));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useEventTypes());

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.data).toBeNull();

    act(() => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.data).toEqual([introCall]));
    expect(result.current.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 6: Убедиться, что тест падает**

Run: `cd frontend && npx vitest run src/shared/api/useEventTypes.test.ts`
Expected: FAIL — `Failed to resolve import "./useEventTypes"`.

- [ ] **Step 7: Реализовать хук**

`frontend/src/shared/api/useEventTypes.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';

import { apiGet } from './client';
import { ApiError, type EventType } from './types';

export interface UseEventTypesResult {
  data: EventType[] | null;
  isLoading: boolean;
  error: ApiError | null;
  retry: () => void;
}

export function useEventTypes(): UseEventTypesResult {
  const [data, setData] = useState<EventType[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setIsLoading(true);
    setError(null);

    apiGet<EventType[]>('/event-types', { signal: controller.signal })
      .then((eventTypes) => {
        if (controller.signal.aborted) {
          return;
        }
        setData(eventTypes);
        setIsLoading(false);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setData(null);
        setError(
          cause instanceof ApiError
            ? cause
            : new ApiError('unknown_error', 'Неизвестная ошибка', 0),
        );
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  return { data, isLoading, error, retry };
}
```

- [ ] **Step 8: Прогнать всё**

Run: `cd frontend && npm test && npm run typecheck && npm run lint`
Expected: все тесты PASS, ошибок типов и линтера нет.

- [ ] **Step 9: Коммит**

```bash
git add frontend/src/shared
git commit -m "feat(frontend): add typed API client and event types hook"
```

---

### Task 3: Hero, превью слотов и блок возможностей

**Files:**
- Create: `frontend/src/features/home/Hero.tsx`, `frontend/src/features/home/Hero.module.css`, `frontend/src/features/home/SlotPreview.tsx`, `frontend/src/features/home/SlotPreview.module.css`, `frontend/src/features/home/Features.tsx`
- Modify: `frontend/src/pages/HomePage.tsx` (заменить временную заглушку из задачи 1)
- Test: `frontend/src/pages/HomePage.test.tsx`

**Interfaces:**
- Consumes: `RootLayout`, `App`, `renderApp` из задачи 1.
- Produces: `Hero`, `SlotPreview`, `Features` из `src/features/home/`; `HomePage`, рендерящий `<Hero />` и `<Features />`.

- [ ] **Step 1: Написать падающий тест главной**

`frontend/src/pages/HomePage.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderApp } from '../test/renderApp';

describe('HomePage', () => {
  it('показывает заголовок, CTA и три карточки возможностей', () => {
    renderApp();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Запись на встречу');

    expect(screen.getByRole('link', { name: /Записаться →/ })).toHaveAttribute('href', '/booking');

    const features = screen.getByRole('region', { name: 'Возможности' });
    expect(within(features).getAllByRole('heading', { level: 3 })).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `cd frontend && npx vitest run src/pages/HomePage.test.tsx`
Expected: FAIL — не найдена ссылка `Записаться →` и регион «Возможности».

- [ ] **Step 3: Реализовать SlotPreview**

`frontend/src/features/home/SlotPreview.module.css`:

```css
.card {
  background-color: var(--mantine-color-white);
  border: 1px solid var(--mantine-color-gray-2);
  box-shadow: 0 24px 60px rgba(26, 27, 30, 0.08);
}

.slot {
  padding: 8px 0;
  border-radius: var(--mantine-radius-sm);
  border: 1px solid var(--mantine-color-gray-3);
  font-size: var(--mantine-font-size-sm);
  font-weight: 500;
  text-align: center;
  color: var(--mantine-color-black);
}

.slotBusy {
  border-color: transparent;
  background-color: var(--mantine-color-gray-1);
  color: var(--mantine-color-gray-5);
  text-decoration: line-through;
}

.slotFree {
  border-color: var(--mantine-color-brand-3);
  background-color: var(--mantine-color-brand-0);
  color: var(--mantine-color-brand-8);
}
```

`frontend/src/features/home/SlotPreview.tsx`:

```tsx
import { Card, Group, SimpleGrid, Text } from '@mantine/core';

import classes from './SlotPreview.module.css';

const SLOTS = [
  { time: '10:00', busy: false },
  { time: '10:30', busy: true },
  { time: '11:00', busy: false },
  { time: '11:30', busy: false },
  { time: '12:00', busy: true },
  { time: '12:30', busy: false },
  { time: '14:00', busy: false },
  { time: '14:30', busy: true },
  { time: '15:00', busy: false },
];

/** Декоративная иллюстрация будущего экрана бронирования: не кликается. */
export function SlotPreview() {
  return (
    <Card className={classes.card} radius="lg" p="lg" aria-hidden visibleFrom="md">
      <Group justify="space-between" mb="md">
        <Text fw={700}>Четверг, 14 мая</Text>
        <Text fz="sm" c="dimmed">
          30 мин
        </Text>
      </Group>

      <SimpleGrid cols={3} spacing="xs">
        {SLOTS.map((slot) => (
          <div
            key={slot.time}
            className={`${classes.slot} ${slot.busy ? classes.slotBusy : classes.slotFree}`}
          >
            {slot.time}
          </div>
        ))}
      </SimpleGrid>
    </Card>
  );
}
```

- [ ] **Step 4: Реализовать Hero**

`frontend/src/features/home/Hero.module.css`:

```css
.hero {
  background:
    radial-gradient(60% 80% at 85% 15%, var(--mantine-color-brand-0) 0%, transparent 70%),
    linear-gradient(180deg, var(--mantine-color-white) 0%, var(--mantine-color-gray-0) 100%);
  border-bottom: 1px solid var(--mantine-color-gray-2);
}

.title {
  font-size: 56px;
  line-height: 1.05;
  letter-spacing: -0.02em;
}

@media (max-width: $mantine-breakpoint-sm) {
  .title {
    font-size: 36px;
  }
}
```

`frontend/src/features/home/Hero.tsx`:

```tsx
import { Badge, Box, Button, Container, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';

import classes from './Hero.module.css';
import { SlotPreview } from './SlotPreview';

export function Hero() {
  return (
    <Box component="section" className={classes.hero} py={{ base: 48, md: 96 }}>
      <Container size="lg">
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={64} verticalSpacing={48}>
          <Stack gap="lg" justify="center" align="flex-start">
            <Badge size="lg" variant="light" radius="sm">
              Быстрая запись на звонок
            </Badge>

            <Title order={1} className={classes.title}>
              Запись на встречу
              <br />
              за пару кликов
            </Title>

            <Text c="dimmed" fz="lg" maw={480}>
              Выберите тип встречи, подходящее время в календаре и оставьте свои контакты.
              Ни регистрации, ни переписки о том, кому когда удобно.
            </Text>

            <Button component={Link} to="/booking" size="lg" radius="md">
              Записаться →
            </Button>
          </Stack>

          <SlotPreview />
        </SimpleGrid>
      </Container>
    </Box>
  );
}
```

- [ ] **Step 5: Реализовать Features**

`frontend/src/features/home/Features.tsx`:

```tsx
import { Card, Container, SimpleGrid, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCalendarEvent, IconSettings, IconUserCheck } from '@tabler/icons-react';

const FEATURES = [
  {
    icon: IconCalendarEvent,
    title: 'Удобное время',
    description: 'Выбор типа события и удобного времени для встречи.',
  },
  {
    icon: IconUserCheck,
    title: 'Бронь без аккаунта',
    description: 'Быстрое бронирование с подтверждением и дополнительными заметками.',
  },
  {
    icon: IconSettings,
    title: 'Всё под контролем',
    description: 'Управление типами встреч и просмотр предстоящих записей в админке.',
  },
];

export function Features() {
  return (
    <Container size="lg" component="section" aria-label="Возможности" py={{ base: 48, md: 80 }}>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
        {FEATURES.map((feature) => (
          <Card key={feature.title} padding="lg" radius="lg" withBorder>
            <ThemeIcon size={44} radius="md" variant="light" mb="md">
              <feature.icon size={24} stroke={1.6} />
            </ThemeIcon>
            <Title order={3} fz="lg" mb={6}>
              {feature.title}
            </Title>
            <Text c="dimmed" fz="sm">
              {feature.description}
            </Text>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  );
}
```

- [ ] **Step 6: Собрать HomePage**

`frontend/src/pages/HomePage.tsx` — заменить содержимое целиком:

```tsx
import { Features } from '../features/home/Features';
import { Hero } from '../features/home/Hero';

export function HomePage() {
  return (
    <>
      <Hero />
      <Features />
    </>
  );
}
```

- [ ] **Step 7: Прогнать тесты**

Run: `cd frontend && npm test && npm run typecheck && npm run lint`
Expected: все тесты PASS (включая тест навигации из задачи 1, который ищет заголовок «Запись на встречу»).

- [ ] **Step 8: Коммит**

```bash
git add frontend/src
git commit -m "feat(frontend): build home hero, slot preview and features sections"
```

---

### Task 4: Секция «Типы встреч» с данными из API

**Files:**
- Create: `frontend/src/features/home/EventTypes.tsx`
- Modify: `frontend/src/pages/HomePage.tsx` (вставить `<EventTypes />` между `Hero` и `Features`)
- Modify: `frontend/src/pages/HomePage.test.tsx` (заглушить `fetch`, чтобы секция не шумела)
- Test: `frontend/src/features/home/EventTypes.test.tsx`

**Interfaces:**
- Consumes: `useEventTypes()` из задачи 2 (`{ data, isLoading, error, retry }`), `renderApp` из задачи 1.
- Produces: `EventTypes` из `src/features/home/EventTypes.tsx`.

- [ ] **Step 1: Написать падающие тесты секции**

`frontend/src/features/home/EventTypes.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderApp } from '../../test/renderApp';
import type { EventType } from '../../shared/api/types';

const EVENT_TYPES: EventType[] = [
  {
    id: 'intro-call',
    name: 'Знакомство',
    description: 'Короткий созвон, чтобы обсудить задачу.',
    durationMinutes: 30,
  },
  {
    id: 'design-review',
    name: 'Ревью дизайна',
    description: 'Разбор макетов и решений.',
    durationMinutes: 60,
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('EventTypes', () => {
  it('рендерит карточки типов с длительностью и ссылкой на бронирование', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(EVENT_TYPES)));

    renderApp();

    const card = await screen.findByRole('link', { name: /Знакомство/ });
    expect(card).toHaveAttribute('href', '/booking/intro-call');
    expect(within(card).getByText('30 мин')).toBeInTheDocument();
    expect(await screen.findByText('60 мин')).toBeInTheDocument();
  });

  it('показывает алерт при ошибке и повторяет запрос по кнопке «Повторить»', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ code: 'unknown_error', message: 'Сбой' }, { status: 500 }),
      )
      .mockResolvedValueOnce(Response.json(EVENT_TYPES));
    vi.stubGlobal('fetch', fetchMock);

    renderApp();

    expect(
      await screen.findByText(/Не удалось загрузить типы встреч/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Повторить' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('link', { name: /Знакомство/ })).toBeInTheDocument();
  });

  it('сообщает, когда типов встреч нет', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json([])));

    renderApp();

    expect(await screen.findByText('Типы встреч пока не созданы.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `cd frontend && npx vitest run src/features/home/EventTypes.test.tsx`
Expected: FAIL — карточки типов не рендерятся (секции ещё нет).

- [ ] **Step 3: Реализовать EventTypes**

`frontend/src/features/home/EventTypes.tsx`:

```tsx
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Skeleton,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertTriangle, IconArrowRight } from '@tabler/icons-react';
import { Link } from 'react-router';

import { useEventTypes } from '../../shared/api/useEventTypes';

export function EventTypes() {
  const { data, isLoading, error, retry } = useEventTypes();

  return (
    <Container size="lg" component="section" aria-label="Типы встреч" py={{ base: 32, md: 64 }}>
      <Stack gap="xs" mb="xl">
        <Title order={2}>Типы встреч</Title>
        <Text c="dimmed">Выберите формат — дальше останется указать время.</Text>
      </Stack>

      {isLoading && (
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
          <Skeleton height={168} radius="lg" />
          <Skeleton height={168} radius="lg" />
          <Skeleton height={168} radius="lg" />
        </SimpleGrid>
      )}

      {!isLoading && error && (
        <Alert
          color="red"
          variant="light"
          radius="md"
          icon={<IconAlertTriangle size={20} />}
          title="Ошибка загрузки"
        >
          <Stack gap="sm" align="flex-start">
            <Text fz="sm">
              Не удалось загрузить типы встреч. Проверьте, запущен ли мок-сервер.
            </Text>
            <Button size="xs" variant="light" color="red" onClick={retry}>
              Повторить
            </Button>
          </Stack>
        </Alert>
      )}

      {!isLoading && !error && data?.length === 0 && (
        <Text c="dimmed">Типы встреч пока не созданы.</Text>
      )}

      {!isLoading && !error && data && data.length > 0 && (
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
          {data.map((eventType) => (
            <Card
              key={eventType.id}
              component={Link}
              to={`/booking/${eventType.id}`}
              padding="lg"
              radius="lg"
              withBorder
            >
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
          ))}
        </SimpleGrid>
      )}
    </Container>
  );
}
```

- [ ] **Step 4: Вставить секцию на главную**

`frontend/src/pages/HomePage.tsx`:

```tsx
import { EventTypes } from '../features/home/EventTypes';
import { Features } from '../features/home/Features';
import { Hero } from '../features/home/Hero';

export function HomePage() {
  return (
    <>
      <Hero />
      <EventTypes />
      <Features />
    </>
  );
}
```

- [ ] **Step 5: Заглушить fetch в остальных тестах главной и навигации**

В `frontend/src/pages/HomePage.test.tsx` добавить перед `renderApp()`:

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json([])));
});

afterEach(() => {
  vi.unstubAllGlobals();
});
```

То же самое добавить в `frontend/src/App.test.tsx` и
`frontend/src/layout/Header.test.tsx`, чтобы секция типов встреч не била
в настоящий `fetch` (в jsdom он приведёт к необработанному отказу промиса).

- [ ] **Step 6: Прогнать все тесты**

Run: `cd frontend && npm test && npm run typecheck && npm run lint`
Expected: все тесты PASS, ошибок нет.

- [ ] **Step 7: Коммит**

```bash
git add frontend/src
git commit -m "feat(frontend): render event types from mock API with loading and error states"
```

---

### Task 5: README и проверка против живого мока

**Files:**
- Create: `frontend/README.md`
- Modify: `README.md` в корне (добавить раздел о фронтенде, если там есть список пакетов)

**Interfaces:**
- Consumes: скрипты `npm run dev`, `npm test`, `npm run build` из задачи 1; `spec/npm run mock` из существующего пакета `spec/`.
- Produces: документацию, кода не добавляет.

- [ ] **Step 1: Написать README**

`frontend/README.md`:

````markdown
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
````

- [ ] **Step 2: Проверить приложение против живого мока**

```bash
cd spec && npm install && npm run mock &
cd frontend && npm run dev
```

Открыть `http://localhost:5173` и убедиться:
- секция «Типы встреч» показывает три карточки: `intro-call` (30 мин),
  `design-review` (60 мин), `coffee-chat` (15 мин);
- клик по карточке ведёт на `/booking/intro-call` с заглушкой, без перезагрузки;
- клик по «Админка» открывает заглушку админки;
- если остановить мок и нажать «Повторить», появляется алерт про мок-сервер.

Остановить оба процесса после проверки.

- [ ] **Step 3: Финальная проверка**

Run: `cd frontend && npm test && npm run lint && npm run build`
Expected: все тесты PASS, линтер чист, сборка успешна.

- [ ] **Step 4: Коммит**

```bash
git add frontend/README.md README.md
git commit -m "docs(frontend): document setup and run order"
```

---

## Соответствие спеке

| Требование спеки | Задача |
|---|---|
| Пакет `frontend/`, Vite 8 + React 19 + TS strict | 1 |
| Mantine 9, тема с палитрой `brand` | 1 |
| React Router 7, `BrowserRouter`, четыре маршрута, `*` → главная | 1 |
| Прилипающая шапка с логотипом, «Записаться», «Админка» | 1 |
| Заглушки `/booking`, `/booking/:eventTypeId`, `/admin` | 1 |
| `VITE_API_BASE_URL`, `.env` в git, `.env.local` в `.gitignore` | 1, 2 |
| Типы по `spec/main.tsp` вручную | 2 |
| Клиент над `fetch` с `ApiError` | 2 |
| `useEventTypes` с `AbortController` и `retry` | 2 |
| Hero: бейдж, заголовок, подзаголовок, CTA | 3 |
| `SlotPreview`: декоративный, `aria-hidden`, скрыт до `md` | 3 |
| Три карточки возможностей | 3 |
| Типы встреч: загрузка / ошибка / успех / пусто | 4 |
| Тесты 1–5 из спеки | 1 (1, 3), 3 (2), 4 (4, 5) |
| `frontend/README.md` с порядком запуска | 5 |

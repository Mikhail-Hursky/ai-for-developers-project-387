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

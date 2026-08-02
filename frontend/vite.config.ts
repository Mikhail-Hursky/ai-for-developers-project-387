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

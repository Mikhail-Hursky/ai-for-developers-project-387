import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderApp } from './test/renderApp';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json([])),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

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

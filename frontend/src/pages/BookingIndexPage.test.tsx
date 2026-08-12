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

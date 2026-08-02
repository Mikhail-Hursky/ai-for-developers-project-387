import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EventType } from '../../shared/api/types';
import { renderApp } from '../../test/renderApp';

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
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(EVENT_TYPES)),
    );

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

    expect(await screen.findByText(/Не удалось загрузить типы встреч/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Повторить' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('link', { name: /Знакомство/ })).toBeInTheDocument();
  });

  it('сообщает, когда типов встреч нет', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json([])),
    );

    renderApp();

    expect(await screen.findByText('Типы встреч пока не созданы.')).toBeInTheDocument();
  });
});

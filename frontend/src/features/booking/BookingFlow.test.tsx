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

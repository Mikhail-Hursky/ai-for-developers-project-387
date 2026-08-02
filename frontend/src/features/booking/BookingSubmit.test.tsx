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

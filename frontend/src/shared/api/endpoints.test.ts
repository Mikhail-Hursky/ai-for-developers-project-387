import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiBaseUrl } from './client';
import {
  createBooking,
  createEventType,
  fetchAvailability,
  fetchEventType,
  fetchEventTypes,
  fetchUpcomingBookings,
} from './endpoints';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stub() {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
    Response.json({}),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function headerOf(init: RequestInit | undefined, name: string): string | null {
  return new Headers(init?.headers).get(name);
}

describe('endpoints', () => {
  it('запрашивает список типов без заголовка Prefer', async () => {
    const fetchMock = stub();

    await fetchEventTypes(new AbortController().signal);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${apiBaseUrl}/event-types`);
    expect(headerOf(fetchMock.mock.calls[0]?.[1], 'Prefer')).toBeNull();
  });

  it('выбирает пример мока по идентификатору типа события', async () => {
    const fetchMock = stub();

    await fetchEventType('design-review', new AbortController().signal);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${apiBaseUrl}/event-types/design-review`);
    expect(headerOf(fetchMock.mock.calls[0]?.[1], 'Prefer')).toBe('example=design-review');
  });

  it('запрашивает слоты с тем же заголовком', async () => {
    const fetchMock = stub();

    await fetchAvailability('coffee-chat', new AbortController().signal);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${apiBaseUrl}/event-types/coffee-chat/slots`);
    expect(headerOf(fetchMock.mock.calls[0]?.[1], 'Prefer')).toBe('example=coffee-chat');
  });

  it('создаёт бронь методом POST', async () => {
    const fetchMock = stub();

    await createBooking({
      eventTypeId: 'intro-call',
      startAt: '2026-08-05T11:00:00Z',
      guestName: 'Анна',
      guestEmail: 'anna@example.com',
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${apiBaseUrl}/bookings`);
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST');
  });

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
});

import type { Availability, Booking, EventType } from '../shared/api/types';

export const INTRO_CALL: EventType = {
  id: 'intro-call',
  name: 'Знакомство',
  description: 'Короткий созвон, чтобы обсудить задачу.',
  durationMinutes: 30,
};

/** Два дня со слотами и один без — хватает, чтобы проверить переключение дней. */
export function availabilityFixture(): Availability {
  return {
    eventTypeId: INTRO_CALL.id,
    slotDurationMinutes: 30,
    windowStartDate: '2026-08-05',
    windowEndDate: '2026-08-07',
    days: [
      {
        date: '2026-08-05',
        slots: [
          { startAt: '2026-08-05T11:00:00Z', endAt: '2026-08-05T11:30:00Z' },
          { startAt: '2026-08-05T12:00:00Z', endAt: '2026-08-05T12:30:00Z' },
        ],
      },
      {
        date: '2026-08-06',
        slots: [{ startAt: '2026-08-06T15:00:00Z', endAt: '2026-08-06T15:30:00Z' }],
      },
      { date: '2026-08-07', slots: [] },
    ],
  };
}

export function bookingFixture(): Booking {
  return {
    id: '4f3a1c6e-59f1-4a0a-9d1f-4f6b0d2c1a01',
    eventType: INTRO_CALL,
    startAt: '2026-08-05T11:00:00Z',
    endAt: '2026-08-05T11:30:00Z',
    guestName: 'Анна Петрова',
    guestEmail: 'anna.petrova@example.com',
    comment: 'Хочу обсудить редизайн лендинга.',
    createdAt: '2026-08-02T09:00:00Z',
  };
}

export const DESIGN_REVIEW: EventType = {
  id: 'design-review',
  name: 'Ревью дизайна',
  description: 'Разбираем макеты и собираем список правок.',
  durationMinutes: 60,
};

/** Тип события, который мок возвращает на `POST /admin/event-types`. */
export const STRATEGY_SESSION: EventType = {
  id: 'strategy-session',
  name: 'Стратегическая сессия',
  description: 'Полтора часа на планирование квартала.',
  durationMinutes: 90,
};

/** Две встречи разных типов в разные дни — хватает, чтобы проверить группировку. */
export function upcomingBookingsFixture(): Booking[] {
  return [
    bookingFixture(),
    {
      id: '7c9e2d4b-2b77-4f8e-8a3c-2f1d5e6b7a02',
      eventType: DESIGN_REVIEW,
      startAt: '2026-08-07T12:00:00Z',
      endAt: '2026-08-07T13:00:00Z',
      guestName: 'Игорь Северов',
      guestEmail: 'igor.severov@example.com',
      createdAt: '2026-08-02T09:30:00Z',
    },
  ];
}

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

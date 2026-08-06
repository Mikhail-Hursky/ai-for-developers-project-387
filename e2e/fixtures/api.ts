import { expect, type APIRequestContext } from '@playwright/test';

/** Тот же адрес, с которым playwright.config.ts собирает фронтенд. */
export const API_BASE_URL = 'http://localhost:3000/api';

export interface Slot {
  startAt: string;
  endAt: string;
}

export interface DayAvailability {
  date: string;
  slots: Slot[];
}

export interface Availability {
  eventTypeId: string;
  slotDurationMinutes: number;
  windowStartDate: string;
  windowEndDate: string;
  days: DayAvailability[];
}

export interface BookingInput {
  eventTypeId: string;
  startAt: string;
  guestName: string;
  guestEmail: string;
}

/**
 * Занять слот в обход интерфейса. Единственное место, где тест ходит в API
 * напрямую: так моделируется чужая бронь, появившаяся, пока гость заполнял
 * форму. Вторая вкладка браузера дала бы то же самое, но зависела бы от
 * таймингов рендера.
 */
export async function createBookingViaApi(
  request: APIRequestContext,
  input: BookingInput,
): Promise<void> {
  const response = await request.post(`${API_BASE_URL}/bookings`, { data: input });
  expect(response.status(), await response.text()).toBe(201);
}

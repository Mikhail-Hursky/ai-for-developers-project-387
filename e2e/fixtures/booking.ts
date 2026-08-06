import { type Page } from '@playwright/test';

import type { Availability, Slot } from './api';

/**
 * Ответ `GET /event-types/<id>/slots`, который получил сам интерфейс. Промис
 * надо создать до перехода на страницу записи: иначе ответ придёт раньше, чем
 * начнётся ожидание, и тест зависнет.
 */
export function waitForAvailability(page: Page, eventTypeId: string): Promise<Availability> {
  return page
    .waitForResponse(
      (response) =>
        response.url().includes(`/event-types/${eventTypeId}/slots`) && response.ok(),
    )
    .then((response) => response.json() as Promise<Availability>);
}

/**
 * Первый свободный слот в окне записи — ровно тот, который интерфейс открывает
 * по умолчанию. Фиксированное время брать нельзя: брони предыдущих тестов
 * закрывают слоты независимо от типа встречи.
 */
export function firstAvailableSlot(availability: Availability): Slot {
  const day = availability.days.find((item) => item.slots.length > 0);

  if (!day) {
    throw new Error(
      `В окне ${availability.windowStartDate}…${availability.windowEndDate} нет свободных слотов`,
    );
  }

  return day.slots[0];
}

/** Подпись кнопки слота: с `timezoneId: 'UTC'` это часы и минуты из `startAt`. */
export function slotLabel(slot: Slot): string {
  return slot.startAt.slice(11, 16);
}

/** `10:00 – 10:30` — так время брони печатают экран подтверждения и админка. */
export function slotRangeLabel(slot: Slot): string {
  return `${slotLabel(slot)} – ${slot.endAt.slice(11, 16)}`;
}

export async function selectSlot(page: Page, slot: Slot): Promise<void> {
  await page
    .getByRole('group', { name: 'Свободные слоты' })
    .getByRole('button', { name: slotLabel(slot), exact: true })
    .click();
}

export interface GuestValues {
  name: string;
  email: string;
  comment: string;
}

export async function fillGuestForm(page: Page, values: GuestValues): Promise<void> {
  await page.getByLabel('Имя').fill(values.name);
  await page.getByLabel('Email').fill(values.email);
  await page.getByLabel('Комментарий').fill(values.comment);
}

/** В шапке есть ссылка «Записаться», поэтому кнопку ищем именно по роли. */
export async function submitGuestForm(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Записаться', exact: true }).click();
}

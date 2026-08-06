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
 * Бэкенд принимает бронь, только если слот начинается не раньше чем через
 * 5 минут. Между выбором слота и отправкой формы тест тратит ещё несколько
 * секунд на клики и ввод, поэтому берём запас: 7 минут.
 */
const MIN_LEAD_TIME_MS = 7 * 60 * 1000;

/**
 * Первый свободный слот в окне записи, до начала которого ещё есть запас по
 * времени. Фиксированное время брать нельзя: брони предыдущих тестов закрывают
 * слоты независимо от типа встречи. Слот у самой границы упреждения тоже не
 * годится — он успеет протухнуть, пока тест заполняет форму.
 */
export function firstAvailableSlot(availability: Availability): Slot {
  const earliestStart = Date.now() + MIN_LEAD_TIME_MS;

  for (const day of availability.days) {
    const slot = day.slots.find((item) => Date.parse(item.startAt) >= earliestStart);

    if (slot) {
      return slot;
    }
  }

  throw new Error(
    `В окне ${availability.windowStartDate}…${availability.windowEndDate} нет свободных слотов`,
  );
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

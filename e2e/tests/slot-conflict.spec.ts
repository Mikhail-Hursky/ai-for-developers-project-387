import { expect, test } from '@playwright/test';

import { createBookingViaApi } from '../fixtures/api';
import {
  fillGuestForm,
  firstAvailableSlot,
  selectSlot,
  slotLabel,
  submitGuestForm,
  waitForAvailability,
} from '../fixtures/booking';
import { createEventType, openEventTypesTab } from '../fixtures/eventType';
import { uniqueEventTypeId } from '../fixtures/ids';

test('слот, занятый во время заполнения формы, показывает предупреждение', async ({
  page,
  request,
}) => {
  const id = uniqueEventTypeId('conflict');
  const eventType = {
    id,
    name: `Консультация ${id}`,
    description: 'Проверка гонки за слот.',
    durationMinutes: 30,
  };

  await openEventTypesTab(page);
  await createEventType(page, eventType);

  const availability = waitForAvailability(page, id);
  await page.goto(`/booking/${id}`);
  const slot = firstAvailableSlot(await availability);

  await selectSlot(page, slot);
  await fillGuestForm(page, {
    name: `Опоздавший ${id}`,
    email: `late-${id}@example.com`,
    comment: 'Успею ли я.',
  });

  // Пока гость заполнял форму, слот занял кто-то другой.
  await createBookingViaApi(request, {
    eventTypeId: id,
    startAt: slot.startAt,
    guestName: `Быстрый ${id}`,
    guestEmail: `fast-${id}@example.com`,
  });

  // На 409 фронтенд сбрасывает выбор и перезапрашивает свободное время:
  // дожидаемся именно этого ответа, иначе проверка сетки гонится с загрузкой.
  const refreshed = waitForAvailability(page, id);
  await submitGuestForm(page);
  await refreshed;

  await expect(page.getByText('Это время уже заняли, выберите другое.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Записаться', exact: true })).toBeHidden();
  await expect(
    page
      .getByRole('group', { name: 'Свободные слоты' })
      .getByRole('button', { name: slotLabel(slot), exact: true }),
  ).toBeHidden();
});

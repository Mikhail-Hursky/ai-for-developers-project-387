import { expect, test } from '@playwright/test';

import { createBookingViaApi } from '../fixtures/api';
import {
  fillGuestForm,
  firstAvailableSlot,
  selectSlot,
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
  const after = await refreshed;

  await expect(page.getByText('Это время уже заняли, выберите другое.')).toBeVisible();

  // Ответ, дошедший до Node, ещё не значит, что React перерисовался: на время
  // загрузки BookingFlow показывает скелетоны без формы и без сетки. Сначала
  // дожидаемся сетки, иначе «скрыто» ниже означало бы «страница ещё грузится».
  await expect(page.getByRole('group', { name: 'Свободные слоты' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Записаться', exact: true })).toBeHidden();

  // Сетка рисует только активный день, а он мог смениться, если занятый слот
  // был в этом дне последним. Поэтому смотрим на сам ответ, а не на кнопку:
  // в соседнем дне нашлась бы кнопка с той же подписью.
  const stillFree = after.days.some((day) =>
    day.slots.some((item) => item.startAt === slot.startAt),
  );
  expect(stillFree, 'занятый слот пропал из обновлённой сетки').toBe(false);
});

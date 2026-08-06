import { expect, test } from '@playwright/test';

import {
  fillGuestForm,
  firstAvailableSlot,
  selectSlot,
  slotRangeLabel,
  submitGuestForm,
  waitForAvailability,
} from '../fixtures/booking';
import { createEventType, openEventTypesTab } from '../fixtures/eventType';
import { uniqueEventTypeId } from '../fixtures/ids';

test('владелец создаёт тип встречи, гость записывается, бронь видна в админке', async ({
  page,
}) => {
  const id = uniqueEventTypeId('flow');
  const eventType = {
    id,
    name: `Знакомство ${id}`,
    description: 'Короткий созвон, чтобы познакомиться.',
    durationMinutes: 30,
  };
  const guest = {
    name: `Гость ${id}`,
    email: `guest-${id}@example.com`,
    comment: 'Хочу обсудить сотрудничество.',
  };

  await test.step('владелец создаёт тип встречи', async () => {
    await openEventTypesTab(page);
    await createEventType(page, eventType);

    // Перезагрузка доказывает, что тип сохранился на сервере: список админки
    // дописывает только что созданный тип ещё и в локальное состояние.
    await page.reload();
    await expect(page.getByText(eventType.name)).toBeVisible();
  });

  const slot = await test.step('гость открывает страницу записи', async () => {
    await page.goto('/booking');

    const card = page.getByRole('link', { name: eventType.name });
    await expect(card).toBeVisible();

    const availability = waitForAvailability(page, id);
    await card.click();

    await expect(page.getByRole('heading', { name: eventType.name })).toBeVisible();
    return firstAvailableSlot(await availability);
  });

  await test.step('гость выбирает слот и отправляет форму', async () => {
    await selectSlot(page, slot);
    await fillGuestForm(page, guest);
    await submitGuestForm(page);
  });

  await test.step('гость видит подтверждение', async () => {
    await expect(page.getByRole('heading', { name: 'Вы записаны' })).toBeVisible();
    await expect(
      page.getByText(`${eventType.name} · ${eventType.durationMinutes} мин`),
    ).toBeVisible();
    // Экран подтверждения печатает длинную дату и время окончания через тире,
    // поэтому `10:00 – 10:30` — это хвост строки; длинную дату не проверяем,
    // её формат задаёт ICU и он меняется от версии к версии.
    await expect(page.getByText(slotRangeLabel(slot))).toBeVisible();
    await expect(page.getByText(guest.name)).toBeVisible();
    await expect(page.getByText(guest.email)).toBeVisible();
    await expect(page.getByText(guest.comment)).toBeVisible();
  });

  await test.step('бронь появилась в предстоящих встречах', async () => {
    await page.goto('/admin');

    await expect(
      page.getByText(`${eventType.name} · ${eventType.durationMinutes} мин`),
    ).toBeVisible();
    await expect(page.getByText(guest.name)).toBeVisible();
    await expect(page.getByRole('link', { name: guest.email })).toBeVisible();
  });
});

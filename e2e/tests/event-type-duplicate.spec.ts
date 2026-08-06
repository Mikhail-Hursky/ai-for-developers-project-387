import { expect, test } from '@playwright/test';

import { createEventType, openEventTypesTab, submitEventTypeForm } from '../fixtures/eventType';
import { uniqueEventTypeId } from '../fixtures/ids';

test('занятый идентификатор типа встречи показывает ошибку под полем', async ({ page }) => {
  const id = uniqueEventTypeId('duplicate');
  const values = {
    id,
    name: `Первый ${id}`,
    description: 'Занимает идентификатор.',
    durationMinutes: 30,
  };

  await openEventTypesTab(page);
  await createEventType(page, values);

  await submitEventTypeForm(page, { ...values, name: `Второй ${id}` });

  // Сообщение приходит от бэкенда с кодом event_type_already_exists и
  // показывается как ошибка поля «Идентификатор», а не всей формы.
  const modal = page.getByRole('dialog');
  await expect(modal.getByText('Тип события с таким id уже существует.')).toBeVisible();

  // Mantine прокидывает `error` в aria-describedby поля: так проверяется, что
  // ошибка привязана именно к «Идентификатору», а не просто лежит в модалке.
  await expect(modal.getByLabel('Идентификатор')).toHaveAccessibleDescription(/уже существует/);

  // Проверка после появления ошибки: сразу после сабмита модалка была бы
  // открыта в любом случае — запрос ещё летит.
  await expect(modal).toBeVisible();
});

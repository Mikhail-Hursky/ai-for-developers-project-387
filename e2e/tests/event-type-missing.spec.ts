import { expect, test } from '@playwright/test';

import { uniqueEventTypeId } from '../fixtures/ids';

test('запись на несуществующий тип встречи ведёт к списку типов', async ({ page }) => {
  await page.goto(`/booking/${uniqueEventTypeId('missing')}`);

  await expect(page.getByRole('heading', { name: 'Тип встречи не найден' })).toBeVisible();

  await page.getByRole('link', { name: 'Выбрать тип встречи' }).click();

  await expect(page).toHaveURL('/booking');
  await expect(page.getByRole('heading', { name: 'Записаться на встречу' })).toBeVisible();
});

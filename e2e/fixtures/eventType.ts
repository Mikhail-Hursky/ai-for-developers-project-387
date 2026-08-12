import { expect, type Page } from '@playwright/test';

export interface EventTypeValues {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
}

/** Открыть вкладку «Типы встреч» админки и дождаться, пока она отрисуется. */
export async function openEventTypesTab(page: Page): Promise<void> {
  await page.goto('/admin?tab=event-types');
  await expect(page.getByRole('button', { name: 'Создать тип' })).toBeVisible();
}

/**
 * Заполнить модалку «Новый тип встречи» и отправить форму. Результат не
 * проверяется: сценарий дубликата ждёт здесь ошибку, а не успех.
 */
export async function submitEventTypeForm(page: Page, values: EventTypeValues): Promise<void> {
  await page.getByRole('button', { name: 'Создать тип' }).click();

  const modal = page.getByRole('dialog');
  await expect(modal.getByText('Новый тип встречи')).toBeVisible();

  await modal.getByLabel('Идентификатор').fill(values.id);
  await modal.getByLabel('Название').fill(values.name);
  await modal.getByLabel('Описание').fill(values.description);

  // NumberInput у Mantine построен на react-number-format: проверяем, что
  // введённое значение действительно оказалось в поле, а не потерялось.
  const duration = modal.getByLabel('Длительность, минут');
  await duration.fill(String(values.durationMinutes));
  await expect(duration).toHaveValue(String(values.durationMinutes));

  // exact: у getByRole имя по умолчанию сопоставляется по подстроке.
  await modal.getByRole('button', { name: 'Создать', exact: true }).click();
}

/** Создать тип встречи через админку и дождаться подтверждения. */
export async function createEventType(page: Page, values: EventTypeValues): Promise<void> {
  await submitEventTypeForm(page, values);

  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText(`Тип встречи «${values.name}» создан.`)).toBeVisible();
}

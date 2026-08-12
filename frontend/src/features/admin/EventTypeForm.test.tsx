import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/renderUi';
import { EventTypeForm } from './EventTypeForm';

function setup(overrides: { fieldErrors?: Record<string, string> } = {}) {
  const onSubmit = vi.fn();
  renderUi(
    <EventTypeForm
      isSubmitting={false}
      submitError={null}
      fieldErrors={overrides.fieldErrors ?? {}}
      onSubmit={onSubmit}
      onCancel={() => {}}
    />,
  );
  return { onSubmit, user: userEvent.setup() };
}

describe('EventTypeForm', () => {
  it('не отправляет пустую форму и показывает ошибки полей', async () => {
    const { onSubmit, user } = setup();

    await user.click(screen.getByRole('button', { name: 'Создать' }));

    expect(await screen.findByText('Укажите идентификатор')).toBeInTheDocument();
    expect(screen.getByText('Укажите название')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('требует правильный формат идентификатора', async () => {
    const { onSubmit, user } = setup();

    await user.type(screen.getByLabelText(/Идентификатор/), 'Intro Call');
    await user.type(screen.getByLabelText(/Название/), 'Знакомство');
    await user.click(screen.getByRole('button', { name: 'Создать' }));

    expect(
      await screen.findByText('Латиница в нижнем регистре, цифры и дефисы, например, intro-call'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('не пропускает длительность вне диапазона', async () => {
    const { onSubmit, user } = setup();

    await user.type(screen.getByLabelText(/Идентификатор/), 'intro-call');
    await user.type(screen.getByLabelText(/Название/), 'Знакомство');
    await user.clear(screen.getByLabelText(/Длительность/));
    await user.type(screen.getByLabelText(/Длительность/), '0');
    await user.click(screen.getByRole('button', { name: 'Создать' }));

    expect(await screen.findByText('От 1 до 1440 минут')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('не пропускает пустую длительность', async () => {
    const { onSubmit, user } = setup();

    await user.type(screen.getByLabelText(/Идентификатор/), 'intro-call');
    await user.type(screen.getByLabelText(/Название/), 'Знакомство');
    await user.clear(screen.getByLabelText(/Длительность/));
    await user.click(screen.getByRole('button', { name: 'Создать' }));

    expect(await screen.findByText('Укажите длительность')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('отдаёт обрезанные значения и число минут', async () => {
    const { onSubmit, user } = setup();

    await user.type(screen.getByLabelText(/Идентификатор/), 'strategy-session');
    await user.type(screen.getByLabelText(/Название/), '  Стратегическая сессия  ');
    await user.type(screen.getByLabelText(/Описание/), 'Планирование квартала.');
    await user.clear(screen.getByLabelText(/Длительность/));
    await user.type(screen.getByLabelText(/Длительность/), '90');
    await user.click(screen.getByRole('button', { name: 'Создать' }));

    expect(onSubmit).toHaveBeenCalledWith({
      id: 'strategy-session',
      name: 'Стратегическая сессия',
      description: 'Планирование квартала.',
      durationMinutes: 90,
    });
  });

  it('показывает ошибку поля, пришедшую с сервера', () => {
    setup({ fieldErrors: { id: 'Тип события с таким id уже существует.' } });

    expect(screen.getByText('Тип события с таким id уже существует.')).toBeInTheDocument();
  });
});

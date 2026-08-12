import { Alert, Button, Group, NumberInput, Stack, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';

import type { CreateEventTypeRequest } from '../../shared/api/types';

interface EventTypeFormValues {
  id: string;
  name: string;
  description: string;
  /** `NumberInput` хранит пустое значение строкой, поэтому тип шире числа. */
  durationMinutes: number | string;
}

interface EventTypeFormProps {
  isSubmitting: boolean;
  /** Общее сообщение об ошибке отправки; ошибки конкретных полей — в fieldErrors. */
  submitError: string | null;
  /** Ошибки по полям из ответов 409 и 422: имя поля → сообщение. */
  fieldErrors: Record<string, string>;
  onSubmit: (values: CreateEventTypeRequest) => void;
  onCancel: () => void;
}

// Ограничения повторяют контракт: spec/main.tsp, модель EventType.
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DEFAULT_DURATION_MINUTES = 30;

export function EventTypeForm({
  isSubmitting,
  submitError,
  fieldErrors,
  onSubmit,
  onCancel,
}: EventTypeFormProps) {
  const form = useForm<EventTypeFormValues>({
    initialValues: {
      id: '',
      name: '',
      description: '',
      durationMinutes: DEFAULT_DURATION_MINUTES,
    },
    validate: {
      id: (value) => {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
          return 'Укажите идентификатор';
        }
        if (trimmed.length > 100) {
          return 'Не больше 100 символов';
        }
        return ID_PATTERN.test(trimmed)
          ? null
          : 'Латиница в нижнем регистре, цифры и дефисы, например, intro-call';
      },
      name: (value) => {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
          return 'Укажите название';
        }
        return trimmed.length > 150 ? 'Не больше 150 символов' : null;
      },
      description: (value) => (value.length > 2000 ? 'Не больше 2000 символов' : null),
      durationMinutes: (value) => {
        if (value === '') {
          return 'Укажите длительность';
        }
        const minutes = Number(value);
        if (!Number.isInteger(minutes)) {
          return 'Укажите целое число минут';
        }
        return minutes >= 1 && minutes <= 1440 ? null : 'От 1 до 1440 минут';
      },
    },
  });

  function handleSubmit(values: EventTypeFormValues) {
    onSubmit({
      id: values.id.trim(),
      name: values.name.trim(),
      description: values.description.trim(),
      durationMinutes: Number(values.durationMinutes),
    });
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <TextInput
          label="Идентификатор"
          description="Попадёт в адрес страницы записи: /booking/intro-call"
          placeholder="intro-call"
          withAsterisk
          {...form.getInputProps('id')}
          error={form.errors.id ?? fieldErrors.id}
        />

        <TextInput
          label="Название"
          placeholder="Знакомство"
          withAsterisk
          {...form.getInputProps('name')}
          error={form.errors.name ?? fieldErrors.name}
        />

        <Textarea
          label="Описание"
          placeholder="О чём эта встреча"
          autosize
          minRows={2}
          maxRows={6}
          {...form.getInputProps('description')}
          error={form.errors.description ?? fieldErrors.description}
        />

        {/*
          clampBehavior="none": по умолчанию NumberInput подтягивает значение
          к min/max при потере фокуса. Введённое молча подменялось бы, и
          владелец не понял бы, почему в поле не то, что он набрал. Границы
          проверяет валидация формы, а min/max остаются для стрелок.
        */}
        <NumberInput
          label="Длительность, минут"
          min={1}
          max={1440}
          clampBehavior="none"
          allowDecimal={false}
          allowNegative={false}
          withAsterisk
          {...form.getInputProps('durationMinutes')}
          error={form.errors.durationMinutes ?? fieldErrors.durationMinutes}
        />

        {submitError && (
          <Alert color="red" variant="light" radius="md">
            {submitError}
          </Alert>
        )}

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onCancel} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Создать
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

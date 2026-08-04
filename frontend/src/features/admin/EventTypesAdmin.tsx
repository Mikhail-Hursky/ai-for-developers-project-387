import { Alert, Badge, Button, Card, Group, Modal, Skeleton, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';

import { createEventType } from '../../shared/api/endpoints';
import { ApiError, type CreateEventTypeRequest, type EventType } from '../../shared/api/types';
import { useEventTypes } from '../../shared/api/useEventTypes';
import { EventTypeForm } from './EventTypeForm';

/**
 * Prism не хранит состояние: созданный тип не появится в `GET /event-types`,
 * поэтому он дописывается в список локально. На реальном бэкенде такой тип
 * придёт из ручки — дубликаты отсеиваются по `id`.
 */
function mergeById(loaded: EventType[], extra: EventType[]): EventType[] {
  return [...loaded, ...extra.filter((item) => !loaded.some((one) => one.id === item.id))];
}

function EventTypeRows({ eventTypes }: { eventTypes: EventType[] }) {
  if (eventTypes.length === 0) {
    return <Text c="dimmed">Типы встреч пока не созданы.</Text>;
  }

  return (
    <Stack gap="sm">
      {eventTypes.map((eventType) => (
        <Card key={eventType.id} withBorder radius="lg" padding="md">
          <Group gap="sm" wrap="nowrap" justify="space-between">
            <Text fw={600}>{eventType.name}</Text>
            <Group gap="xs" wrap="nowrap">
              <Badge variant="light" radius="sm">
                {eventType.durationMinutes} мин
              </Badge>
              <Badge variant="outline" radius="sm">
                {eventType.id}
              </Badge>
            </Group>
          </Group>

          {eventType.description && (
            <Text fz="sm" c="dimmed" mt={6}>
              {eventType.description}
            </Text>
          )}
        </Card>
      ))}
    </Stack>
  );
}

export function EventTypesAdmin() {
  const { data, isLoading, error, retry } = useEventTypes();
  const [created, setCreated] = useState<EventType[]>([]);
  const [lastCreated, setLastCreated] = useState<EventType | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<ApiError | null>(null);

  function openModal() {
    setSubmitError(null);
    setLastCreated(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  async function handleSubmit(values: CreateEventTypeRequest) {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const eventType = await createEventType(values);
      setCreated((current) => mergeById(current, [eventType]));
      setLastCreated(eventType);
      setModalOpen(false);
    } catch (cause) {
      setSubmitError(
        cause instanceof ApiError
          ? cause
          : new ApiError('unknown_error', 'Не удалось создать тип встречи', 0),
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Занятый `id` — это ошибка одного поля, а не всей формы: показываем её там,
  // где владелец может её исправить.
  const fieldErrors =
    submitError?.code === 'event_type_already_exists'
      ? { id: submitError.message }
      : Object.fromEntries(
          (submitError?.fieldErrors ?? []).map((item): [string, string] => [
            item.field,
            item.message,
          ]),
        );
  const generalSubmitError =
    submitError && submitError.code !== 'event_type_already_exists' ? submitError.message : null;

  return (
    <Stack gap="lg">
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Text c="dimmed" fz="sm">
          Типы встреч, доступные гостям.
        </Text>
        <Button leftSection={<IconPlus size={16} />} onClick={openModal}>
          Создать тип
        </Button>
      </Group>

      {lastCreated && (
        <Alert color="green" variant="light" radius="md" icon={<IconCheck size={20} />}>
          Тип встречи «{lastCreated.name}» создан.
        </Alert>
      )}

      {isLoading && (
        <Stack gap="sm">
          <Skeleton height={72} radius="lg" />
          <Skeleton height={72} radius="lg" />
        </Stack>
      )}

      {error && (
        <Alert
          color="red"
          variant="light"
          radius="md"
          icon={<IconAlertTriangle size={20} />}
          title="Ошибка загрузки"
        >
          <Stack gap="sm" align="flex-start">
            <Text fz="sm">Не удалось загрузить типы встреч. Проверьте, запущен ли мок-сервер.</Text>
            <Button size="xs" variant="light" color="red" onClick={retry}>
              Повторить
            </Button>
          </Stack>
        </Alert>
      )}

      {!isLoading && !error && <EventTypeRows eventTypes={mergeById(data ?? [], created)} />}

      <Modal opened={isModalOpen} onClose={closeModal} title="Новый тип встречи" radius="lg" centered>
        <EventTypeForm
          isSubmitting={isSubmitting}
          submitError={generalSubmitError}
          fieldErrors={fieldErrors}
          onSubmit={handleSubmit}
          onCancel={closeModal}
        />
      </Modal>
    </Stack>
  );
}

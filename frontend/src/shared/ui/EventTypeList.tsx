import { Alert, Button, SimpleGrid, Skeleton, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

import type { EventType } from '../api/types';
import type { ApiResource } from '../api/useApiResource';
import { EventTypeCard } from './EventTypeCard';

export function EventTypeList({ resource }: { resource: ApiResource<EventType[]> }) {
  const { data, isLoading, error, retry } = resource;

  if (isLoading) {
    return (
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
        <Skeleton height={168} radius="lg" />
        <Skeleton height={168} radius="lg" />
        <Skeleton height={168} radius="lg" />
      </SimpleGrid>
    );
  }

  if (error) {
    return (
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
    );
  }

  if (!data || data.length === 0) {
    return <Text c="dimmed">Типы встреч пока не созданы.</Text>;
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
      {data.map((eventType) => (
        <EventTypeCard key={eventType.id} eventType={eventType} />
      ))}
    </SimpleGrid>
  );
}

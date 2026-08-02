import { Container, Stack, Text, Title } from '@mantine/core';

import { useEventTypes } from '../shared/api/useEventTypes';
import { EventTypeList } from '../shared/ui/EventTypeList';

export function BookingIndexPage() {
  const resource = useEventTypes();

  return (
    <Container size="lg" py={{ base: 32, md: 64 }}>
      <Stack gap="xs" mb="xl">
        <Title order={1}>Записаться на встречу</Title>
        <Text c="dimmed">Выберите тип встречи — дальше выберете день и время.</Text>
      </Stack>

      <EventTypeList resource={resource} />
    </Container>
  );
}

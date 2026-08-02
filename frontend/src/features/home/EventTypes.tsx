import { Container, Stack, Text, Title } from '@mantine/core';

import { useEventTypes } from '../../shared/api/useEventTypes';
import { EventTypeList } from '../../shared/ui/EventTypeList';

export function EventTypes() {
  const resource = useEventTypes();

  return (
    <Container size="lg" component="section" aria-label="Типы встреч" py={{ base: 32, md: 64 }}>
      <Stack gap="xs" mb="xl">
        <Title order={2}>Типы встреч</Title>
        <Text c="dimmed">Выберите формат — дальше останется указать время.</Text>
      </Stack>

      <EventTypeList resource={resource} />
    </Container>
  );
}

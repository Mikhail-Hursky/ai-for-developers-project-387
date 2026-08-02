import { Badge, Card, Group, Text, Title } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { Link } from 'react-router';

import type { EventType } from '../api/types';

export function EventTypeCard({ eventType }: { eventType: EventType }) {
  return (
    <Card component={Link} to={`/booking/${eventType.id}`} padding="lg" radius="lg" withBorder>
      <Group justify="space-between" mb="xs" wrap="nowrap">
        <Title order={3} fz="lg">
          {eventType.name}
        </Title>
        <Badge variant="light" radius="sm">
          {eventType.durationMinutes} мин
        </Badge>
      </Group>

      <Text c="dimmed" fz="sm" mb="md" lineClamp={3}>
        {eventType.description}
      </Text>

      <Group gap={6} c="brand.7" fz="sm" fw={500} mt="auto">
        Записаться
        <IconArrowRight size={16} stroke={1.8} />
      </Group>
    </Card>
  );
}

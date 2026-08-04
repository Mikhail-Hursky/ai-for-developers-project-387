import { Anchor, Badge, Card, Group, Stack, Text } from '@mantine/core';

import type { Booking } from '../../shared/api/types';
import { formatTimeRange } from '../../shared/format/datetime';

export function BookingCard({ booking }: { booking: Booking }) {
  return (
    <Card withBorder radius="lg" padding="md">
      <Stack gap="xs">
        <Group gap="sm" wrap="nowrap" justify="space-between">
          <Text fw={600}>{formatTimeRange(booking.startAt, booking.endAt)}</Text>
          <Badge variant="light" radius="sm">
            {booking.eventType.name} · {booking.eventType.durationMinutes} мин
          </Badge>
        </Group>

        <Group gap={6} wrap="wrap">
          <Text fz="sm">{booking.guestName}</Text>
          <Text fz="sm" c="dimmed">
            ·
          </Text>
          <Anchor href={`mailto:${booking.guestEmail}`} fz="sm">
            {booking.guestEmail}
          </Anchor>
        </Group>

        {booking.comment && (
          <Text fz="sm" c="dimmed" fs="italic">
            {booking.comment}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

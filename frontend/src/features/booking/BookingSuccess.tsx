import { Button, Card, Container, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { Link } from 'react-router';

import type { Booking } from '../../shared/api/types';
import { formatDateTimeLong, formatTime } from '../../shared/format/datetime';

export function BookingSuccess({ booking }: { booking: Booking }) {
  return (
    <Container size="lg" py={{ base: 32, md: 64 }}>
      <Card withBorder radius="lg" padding="xl" maw={560}>
        <Stack gap="md" align="flex-start">
          <ThemeIcon size={48} radius="xl" color="teal" variant="light">
            <IconCheck size={26} stroke={2} />
          </ThemeIcon>

          <Title order={1} fz="h2">
            Вы записаны
          </Title>

          <Stack gap={4}>
            <Text c="dimmed" fz="sm">
              {booking.eventType.name} · {booking.eventType.durationMinutes} мин
            </Text>
            <Text fw={600}>
              {formatDateTimeLong(booking.startAt)} – {formatTime(booking.endAt)}
            </Text>
          </Stack>

          <Stack gap={4}>
            <Text>{booking.guestName}</Text>
            <Text c="dimmed" fz="sm">
              {booking.guestEmail}
            </Text>
            {booking.comment && (
              <Text c="dimmed" fz="sm">
                {booking.comment}
              </Text>
            )}
          </Stack>

          <Group gap="sm">
            <Button component={Link} to="/booking">
              Записаться ещё раз
            </Button>
            <Button component={Link} to="/" variant="default">
              На главную
            </Button>
          </Group>
        </Stack>
      </Card>
    </Container>
  );
}

import { Alert, Button, Skeleton, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

import type { Booking } from '../../shared/api/types';
import { useUpcomingBookings } from '../../shared/api/useUpcomingBookings';
import { currentTimeZone, formatDateLong, localDateKey } from '../../shared/format/datetime';
import { BookingCard } from './BookingCard';

interface BookingsDay {
  key: string;
  label: string;
  bookings: Booking[];
}

/**
 * Режет список на группы по календарному дню в местном поясе. Порядок
 * сохраняется: ручка уже отдала брони по возрастанию `startAt`, сортировать
 * заново не нужно.
 */
function groupByDay(bookings: Booking[]): BookingsDay[] {
  const days: BookingsDay[] = [];

  for (const booking of bookings) {
    const key = localDateKey(booking.startAt);
    const lastDay = days.at(-1);

    if (lastDay?.key === key) {
      lastDay.bookings.push(booking);
    } else {
      days.push({ key, label: formatDateLong(booking.startAt), bookings: [booking] });
    }
  }

  return days;
}

export function UpcomingBookings() {
  const { data, isLoading, error, retry } = useUpcomingBookings();

  if (isLoading) {
    return (
      <Stack gap="md">
        <Skeleton height={20} width={180} />
        <Skeleton height={96} radius="lg" />
        <Skeleton height={96} radius="lg" />
      </Stack>
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
          <Text fz="sm">
            Не удалось загрузить предстоящие встречи. Проверьте, запущен ли мок-сервер.
          </Text>
          <Button size="xs" variant="light" color="red" onClick={retry}>
            Повторить
          </Button>
        </Stack>
      </Alert>
    );
  }

  if (!data || data.length === 0) {
    return <Text c="dimmed">Предстоящих встреч пока нет.</Text>;
  }

  return (
    <Stack gap="xl">
      {groupByDay(data).map((day) => (
        <Stack key={day.key} gap="sm">
          <Title order={2} fz="md" tt="capitalize">
            {day.label}
          </Title>
          {day.bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </Stack>
      ))}

      <Text fz="xs" c="dimmed">
        Время указано в вашем часовом поясе ({currentTimeZone()}).
      </Text>
    </Stack>
  );
}

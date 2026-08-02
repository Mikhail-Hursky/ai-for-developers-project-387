import { Alert, Button, Container, Grid, Group, Skeleton, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router';

import type { Slot } from '../../shared/api/types';
import { useBookingData } from '../../shared/api/useBookingData';
import { currentTimeZone, formatDateTimeLong, formatTime } from '../../shared/format/datetime';
import { DayList } from './DayList';
import { SlotGrid } from './SlotGrid';

export function BookingFlow({ eventTypeId }: { eventTypeId: string }) {
  const { data, isLoading, error, retry } = useBookingData(eventTypeId);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  if (error?.code === 'not_found') {
    return (
      <Container size="lg" py={{ base: 32, md: 64 }}>
        <Stack gap="md" align="flex-start">
          <Title order={1}>Тип встречи не найден</Title>
          <Text c="dimmed">Возможно, ссылка устарела или тип встречи удалили.</Text>
          <Button component={Link} to="/booking">
            Выбрать тип встречи
          </Button>
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="lg" py={{ base: 32, md: 64 }}>
        <Alert
          color="red"
          variant="light"
          radius="md"
          icon={<IconAlertTriangle size={20} />}
          title="Ошибка загрузки"
        >
          <Stack gap="sm" align="flex-start">
            <Text fz="sm">
              Не удалось загрузить свободное время. Проверьте, запущен ли мок-сервер.
            </Text>
            <Button size="xs" variant="light" color="red" onClick={retry}>
              Повторить
            </Button>
          </Stack>
        </Alert>
      </Container>
    );
  }

  if (isLoading || !data) {
    return (
      <Container size="lg" py={{ base: 32, md: 64 }}>
        <Stack gap="lg">
          <Skeleton height={40} width={280} />
          <Grid gap="xl">
            <Grid.Col span={{ base: 12, md: 5 }}>
              <Skeleton height={320} radius="md" />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 7 }}>
              <Skeleton height={200} radius="md" />
            </Grid.Col>
          </Grid>
        </Stack>
      </Container>
    );
  }

  const { eventType, availability } = data;
  const days = availability.days;
  const firstDateWithSlots = days.find((day) => day.slots.length > 0)?.date ?? null;
  const activeDate = selectedDate ?? firstDateWithSlots;
  const activeDay = days.find((day) => day.date === activeDate) ?? null;

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    setSelectedSlot(null);
  }

  return (
    <Container size="lg" py={{ base: 32, md: 64 }}>
      <Stack gap="xs" mb="xl">
        <Group gap="sm" align="baseline">
          <Title order={1}>{eventType.name}</Title>
          <Text c="dimmed">{eventType.durationMinutes} мин</Text>
        </Group>
        <Text c="dimmed" maw={640}>
          {eventType.description}
        </Text>
      </Stack>

      {firstDateWithSlots === null ? (
        <Text c="dimmed">На ближайшие две недели свободных слотов нет.</Text>
      ) : (
        <Grid gap="xl">
          <Grid.Col span={{ base: 12, md: 5 }}>
            <DayList days={days} selectedDate={activeDate} onSelect={handleSelectDate} />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 7 }}>
            <Stack gap="sm">
              <SlotGrid
                slots={activeDay?.slots ?? []}
                selectedStartAt={selectedSlot?.startAt ?? null}
                onSelect={setSelectedSlot}
              />
              <Text fz="xs" c="dimmed">
                Время указано в вашем часовом поясе ({currentTimeZone()}).
              </Text>
            </Stack>
          </Grid.Col>
        </Grid>
      )}

      {selectedSlot && (
        <Text mt="xl" fw={500}>
          Вы выбрали: {formatDateTimeLong(selectedSlot.startAt)} – {formatTime(selectedSlot.endAt)}
        </Text>
      )}
    </Container>
  );
}

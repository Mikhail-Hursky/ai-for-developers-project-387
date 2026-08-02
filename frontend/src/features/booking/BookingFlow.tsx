import { Alert, Button, Container, Grid, Group, Skeleton, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle, IconClockExclamation } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { createBooking } from '../../shared/api/endpoints';
import { ApiError, type Booking, type Slot } from '../../shared/api/types';
import { useBookingData } from '../../shared/api/useBookingData';
import { currentTimeZone, formatDateTimeLong, formatTime } from '../../shared/format/datetime';
import { BookingSuccess } from './BookingSuccess';
import { DayList } from './DayList';
import { GuestForm, type GuestFormValues } from './GuestForm';
import { SlotGrid } from './SlotGrid';

export function BookingFlow({ eventTypeId }: { eventTypeId: string }) {
  const { data, isLoading, error, retry } = useBookingData(eventTypeId);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<ApiError | null>(null);

  if (booking) {
    return <BookingSuccess booking={booking} />;
  }

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
        {submitError?.code === 'slot_already_booked' && (
          <Alert
            color="yellow"
            variant="light"
            radius="md"
            mb="lg"
            icon={<IconClockExclamation size={20} />}
          >
            Это время уже заняли, выберите другое.
          </Alert>
        )}
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

  async function handleSubmit(values: GuestFormValues) {
    if (!selectedSlot) {
      return;
    }

    const comment = values.comment.trim();

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const created = await createBooking({
        eventTypeId,
        startAt: selectedSlot.startAt,
        guestName: values.guestName.trim(),
        guestEmail: values.guestEmail.trim(),
        ...(comment ? { comment } : {}),
      });
      setBooking(created);
    } catch (cause) {
      const apiError =
        cause instanceof ApiError
          ? cause
          : new ApiError('unknown_error', 'Не удалось создать запись', 0);
      setSubmitError(apiError);

      // Слот заняли, пока гость заполнял форму: сбрасываем выбор и
      // перезапрашиваем свободное время, как требует контракт.
      if (apiError.code === 'slot_already_booked') {
        setSelectedSlot(null);
        retry();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const fieldErrors = Object.fromEntries(
    (submitError?.fieldErrors ?? []).map((item): [string, string] => [item.field, item.message]),
  );
  const generalSubmitError =
    submitError && submitError.code !== 'slot_already_booked' ? submitError.message : null;

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

      {submitError?.code === 'slot_already_booked' && (
        <Alert
          color="yellow"
          variant="light"
          radius="md"
          mb="lg"
          icon={<IconClockExclamation size={20} />}
        >
          Это время уже заняли, выберите другое.
        </Alert>
      )}

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
        <GuestForm
          slotLabel={`${formatDateTimeLong(selectedSlot.startAt)} – ${formatTime(selectedSlot.endAt)}`}
          isSubmitting={isSubmitting}
          submitError={generalSubmitError}
          fieldErrors={fieldErrors}
          onSubmit={handleSubmit}
        />
      )}
    </Container>
  );
}

import { Card, Group, SimpleGrid, Text } from '@mantine/core';

import classes from './SlotPreview.module.css';

const SLOTS = [
  { time: '10:00', busy: false },
  { time: '10:30', busy: true },
  { time: '11:00', busy: false },
  { time: '11:30', busy: false },
  { time: '12:00', busy: true },
  { time: '12:30', busy: false },
  { time: '14:00', busy: false },
  { time: '14:30', busy: true },
  { time: '15:00', busy: false },
];

/** Декоративная иллюстрация будущего экрана бронирования: не кликается. */
export function SlotPreview() {
  return (
    <Card className={classes.card} radius="lg" p="lg" aria-hidden visibleFrom="md">
      <Group justify="space-between" mb="md">
        <Text fw={700}>Четверг, 14 мая</Text>
        <Text fz="sm" c="dimmed">
          30 мин
        </Text>
      </Group>

      <SimpleGrid cols={3} spacing="xs">
        {SLOTS.map((slot) => (
          <div
            key={slot.time}
            className={`${classes.slot} ${slot.busy ? classes.slotBusy : classes.slotFree}`}
          >
            {slot.time}
          </div>
        ))}
      </SimpleGrid>
    </Card>
  );
}

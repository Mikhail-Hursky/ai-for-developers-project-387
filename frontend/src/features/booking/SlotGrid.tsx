import { Button, SimpleGrid, Text } from '@mantine/core';

import type { Slot } from '../../shared/api/types';
import { formatTime } from '../../shared/format/datetime';

interface SlotGridProps {
  slots: Slot[];
  selectedStartAt: string | null;
  onSelect: (slot: Slot) => void;
}

export function SlotGrid({ slots, selectedStartAt, onSelect }: SlotGridProps) {
  if (slots.length === 0) {
    return <Text c="dimmed">В этот день свободных слотов нет.</Text>;
  }

  return (
    <SimpleGrid cols={{ base: 3, sm: 4 }} spacing="xs" role="group" aria-label="Свободные слоты">
      {slots.map((slot) => (
        <Button
          key={slot.startAt}
          variant={slot.startAt === selectedStartAt ? 'filled' : 'light'}
          onClick={() => onSelect(slot)}
        >
          {formatTime(slot.startAt)}
        </Button>
      ))}
    </SimpleGrid>
  );
}

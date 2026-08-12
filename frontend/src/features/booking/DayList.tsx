import { Button, Stack, Text } from '@mantine/core';

import type { DayAvailability } from '../../shared/api/types';
import { formatDayLabel } from '../../shared/format/datetime';
import { formatSlotCount } from '../../shared/format/plural';

interface DayListProps {
  days: DayAvailability[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
}

export function DayList({ days, selectedDate, onSelect }: DayListProps) {
  return (
    <Stack gap={6} role="group" aria-label="Дни окна записи">
      {days.map((day) => {
        const isEmpty = day.slots.length === 0;

        return (
          <Button
            key={day.date}
            fullWidth
            justify="space-between"
            variant={day.date === selectedDate ? 'filled' : 'default'}
            disabled={isEmpty}
            onClick={() => onSelect(day.date)}
            rightSection={
              <Text fz="xs" c={day.date === selectedDate ? undefined : 'dimmed'}>
                {isEmpty ? 'нет слотов' : formatSlotCount(day.slots.length)}
              </Text>
            }
          >
            {formatDayLabel(day.date)}
          </Button>
        );
      })}
    </Stack>
  );
}

import { useCallback } from 'react';

import { fetchAvailability, fetchEventType } from './endpoints';
import type { Availability, EventType } from './types';
import { useApiResource, type ApiResource } from './useApiResource';

export interface BookingData {
  eventType: EventType;
  availability: Availability;
}

/** Тип события и его слоты одним состоянием: один спиннер и один алерт ошибки. */
export function useBookingData(eventTypeId: string): ApiResource<BookingData> {
  const loader = useCallback(
    async (signal: AbortSignal): Promise<BookingData> => {
      const [eventType, availability] = await Promise.all([
        fetchEventType(eventTypeId, signal),
        fetchAvailability(eventTypeId, signal),
      ]);

      return { eventType, availability };
    },
    [eventTypeId],
  );

  return useApiResource(loader);
}

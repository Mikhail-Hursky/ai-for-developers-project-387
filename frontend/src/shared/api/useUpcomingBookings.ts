import { useCallback } from 'react';

import { fetchUpcomingBookings } from './endpoints';
import type { Booking } from './types';
import { useApiResource, type ApiResource } from './useApiResource';

export function useUpcomingBookings(): ApiResource<Booking[]> {
  const loader = useCallback((signal: AbortSignal) => fetchUpcomingBookings(signal), []);

  return useApiResource(loader);
}

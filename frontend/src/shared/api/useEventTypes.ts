import { useCallback } from 'react';

import { fetchEventTypes } from './endpoints';
import type { EventType } from './types';
import { useApiResource, type ApiResource } from './useApiResource';

export function useEventTypes(): ApiResource<EventType[]> {
  const loader = useCallback((signal: AbortSignal) => fetchEventTypes(signal), []);

  return useApiResource(loader);
}

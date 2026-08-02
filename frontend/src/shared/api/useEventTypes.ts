import { useCallback, useEffect, useState } from 'react';

import { apiGet } from './client';
import { ApiError, type EventType } from './types';

export interface UseEventTypesResult {
  data: EventType[] | null;
  isLoading: boolean;
  error: ApiError | null;
  retry: () => void;
}

export function useEventTypes(): UseEventTypesResult {
  const [data, setData] = useState<EventType[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    apiGet<EventType[]>('/event-types', { signal: controller.signal })
      .then((eventTypes) => {
        if (controller.signal.aborted) {
          return;
        }
        setData(eventTypes);
        setIsLoading(false);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setData(null);
        setError(
          cause instanceof ApiError ? cause : new ApiError('unknown_error', 'Неизвестная ошибка', 0),
        );
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [attempt]);

  // Состояние сбрасывается здесь, а не в эффекте: синхронный setState внутри
  // эффекта вызывает лишний проход рендера и запрещён правилом react-hooks.
  const retry = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(true);
    setAttempt((current) => current + 1);
  }, []);

  return { data, isLoading, error, retry };
}

import { useCallback, useEffect, useState } from 'react';

import { ApiError } from './types';

export interface ApiResource<T> {
  data: T | null;
  isLoading: boolean;
  error: ApiError | null;
  retry: () => void;
}

/**
 * Загрузка одного ресурса: запрос на монтировании, отмена на размонтировании,
 * повтор по `retry`. `loader` должен быть стабильным (обычно `useCallback`):
 * его смена перезапускает запрос.
 */
export function useApiResource<T>(loader: (signal: AbortSignal) => Promise<T>): ApiResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    loader(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }
        setData(result);
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
  }, [loader, attempt]);

  // Состояние сбрасывается здесь, а не в эффекте: синхронный setState внутри
  // эффекта запрещён правилом react-hooks/set-state-in-effect.
  const retry = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(true);
    setAttempt((current) => current + 1);
  }, []);

  return { data, isLoading, error, retry };
}

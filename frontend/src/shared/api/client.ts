import { ApiError, type ApiErrorCode, type FieldError } from './types';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!rawBaseUrl) {
  throw new Error(
    'VITE_API_BASE_URL не задан. Укажите адрес мок-сервера в frontend/.env, например http://localhost:4010',
  );
}

export const apiBaseUrl = rawBaseUrl.replace(/\/+$/, '');

interface ErrorBody {
  code?: ApiErrorCode;
  message?: string;
  errors?: FieldError[];
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...init?.headers },
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause;
    }
    throw new ApiError('network_error', 'Не удалось связаться с сервером', 0);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ErrorBody | null;
    throw new ApiError(
      body?.code ?? 'unknown_error',
      body?.message ?? `Сервер ответил кодом ${response.status}`,
      response.status,
      body?.errors,
    );
  }

  return (await response.json()) as T;
}

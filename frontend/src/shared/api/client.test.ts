import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiBaseUrl, apiGet } from './client';
import { ApiError } from './types';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiGet', () => {
  it('подставляет базовый URL и возвращает разобранный JSON', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      Response.json([{ id: 'intro-call' }]),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiGet<Array<{ id: string }>>('/event-types');

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${apiBaseUrl}/event-types`);
    expect(result).toEqual([{ id: 'intro-call' }]);
  });

  it('поднимает ApiError с кодом и сообщением из тела ответа', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ code: 'not_found', message: 'Тип события не найден' }, { status: 404 }),
      ),
    );

    const error = await apiGet('/event-types/nope').catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: 'not_found',
      message: 'Тип события не найден',
      status: 404,
    });
  });

  it('поднимает ApiError с кодом network_error, когда fetch упал', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );

    const error = await apiGet('/event-types').catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('network_error');
  });
});

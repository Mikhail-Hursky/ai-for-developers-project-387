import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EventType } from './types';
import { useEventTypes } from './useEventTypes';

const introCall: EventType = {
  id: 'intro-call',
  name: 'Знакомство',
  description: 'Короткий созвон',
  durationMinutes: 30,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useEventTypes', () => {
  it('загружает список при монтировании', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json([introCall])),
    );

    const { result } = renderHook(() => useEventTypes());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([introCall]);
    expect(result.current.error).toBeNull();
  });

  it('кладёт ошибку в error и повторяет запрос по retry', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ code: 'unknown_error', message: 'Сбой' }, { status: 500 }),
      )
      .mockResolvedValueOnce(Response.json([introCall]));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useEventTypes());

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.data).toBeNull();

    act(() => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.data).toEqual([introCall]));
    expect(result.current.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

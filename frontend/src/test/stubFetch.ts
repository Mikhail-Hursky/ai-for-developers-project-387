import { vi } from 'vitest';

export interface FetchRoutes {
  /** `GET /event-types/{id}` */
  eventType?: () => Response;
  /** `GET /event-types/{id}/slots` */
  slots?: () => Response;
  /** `POST /bookings` */
  booking?: () => Response;
  /** `GET /event-types` */
  eventTypes?: () => Response;
  /** `GET /admin/bookings/upcoming` */
  upcomingBookings?: () => Response;
  /** `POST /admin/event-types` */
  createEventType?: () => Response;
}

/**
 * Подменяет `fetch` и раздаёт ответы по URL. Порядок проверок важен:
 * админские пути идут первыми (`/admin/event-types` заканчивается на
 * `/event-types`), а путь слотов содержит в себе путь типа события.
 */
export function stubFetch(routes: FetchRoutes) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = String(input);

    if (url.endsWith('/admin/bookings/upcoming') && routes.upcomingBookings) {
      return routes.upcomingBookings();
    }
    if (url.endsWith('/admin/event-types') && routes.createEventType) {
      return routes.createEventType();
    }
    if (url.endsWith('/slots') && routes.slots) {
      return routes.slots();
    }
    if (url.endsWith('/bookings') && routes.booking) {
      return routes.booking();
    }
    if (url.endsWith('/event-types') && routes.eventTypes) {
      return routes.eventTypes();
    }
    if (url.includes('/event-types/') && routes.eventType) {
      return routes.eventType();
    }

    throw new Error(`Тестовый fetch не знает, что ответить на ${url}`);
  });

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

/** Количество запросов к слотам — для проверок перезапроса. */
export function slotsRequestCount(fetchMock: { mock: { calls: unknown[][] } }): number {
  return fetchMock.mock.calls.filter((call) => String(call[0]).endsWith('/slots')).length;
}

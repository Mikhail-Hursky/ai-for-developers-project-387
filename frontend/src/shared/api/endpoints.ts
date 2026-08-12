import { apiGet, apiPost } from './client';
import type {
  Availability,
  Booking,
  CreateBookingRequest,
  CreateEventTypeRequest,
  EventType,
} from './types';

/**
 * Prism выбирает пример ответа заголовком `Prefer`. Примеры ручек по id названы
 * идентификатором типа события: без заголовка мок отдал бы первый пример —
 * слоты `intro-call` — для любого типа. Настоящий бэкенд заголовок игнорирует.
 */
function preferExample(eventTypeId: string): HeadersInit {
  return { Prefer: `example=${eventTypeId}` };
}

export function fetchEventTypes(signal: AbortSignal): Promise<EventType[]> {
  return apiGet<EventType[]>('/event-types', { signal });
}

export function fetchEventType(eventTypeId: string, signal: AbortSignal): Promise<EventType> {
  return apiGet<EventType>(`/event-types/${encodeURIComponent(eventTypeId)}`, {
    signal,
    headers: preferExample(eventTypeId),
  });
}

export function fetchAvailability(eventTypeId: string, signal: AbortSignal): Promise<Availability> {
  return apiGet<Availability>(`/event-types/${encodeURIComponent(eventTypeId)}/slots`, {
    signal,
    headers: preferExample(eventTypeId),
  });
}

export function createBooking(
  request: CreateBookingRequest,
  signal?: AbortSignal,
): Promise<Booking> {
  return apiPost<Booking>('/bookings', request, { signal });
}

export function fetchUpcomingBookings(signal: AbortSignal): Promise<Booking[]> {
  return apiGet<Booking[]>('/admin/bookings/upcoming', { signal });
}

export function createEventType(
  request: CreateEventTypeRequest,
  signal?: AbortSignal,
): Promise<EventType> {
  return apiPost<EventType>('/admin/event-types', request, { signal });
}

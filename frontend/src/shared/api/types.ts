/** Типы описаны вручную по spec/main.tsp. Даты — строки ISO-8601 в UTC. */

export interface EventType {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
}

export interface Slot {
  startAt: string;
  endAt: string;
}

export interface DayAvailability {
  date: string;
  slots: Slot[];
}

export interface Availability {
  eventTypeId: string;
  slotDurationMinutes: number;
  windowStartDate: string;
  windowEndDate: string;
  days: DayAvailability[];
}

export interface Booking {
  id: string;
  eventType: EventType;
  startAt: string;
  endAt: string;
  guestName: string;
  guestEmail: string;
  comment?: string;
  createdAt: string;
}

export interface FieldError {
  field: string;
  message: string;
}

export type ApiErrorCode =
  | 'not_found'
  | 'slot_already_booked'
  | 'event_type_already_exists'
  | 'validation_failed'
  | 'network_error'
  | 'unknown_error';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly fieldErrors?: FieldError[];

  constructor(code: ApiErrorCode, message: string, status: number, fieldErrors?: FieldError[]) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

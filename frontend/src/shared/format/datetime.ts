const LOCALE = 'ru-RU';

/** Часовой пояс окружения — его же показываем гостю в подписи под слотами. */
export function currentTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * `2026-08-05` → `ср, 5 авг.`
 * Календарная дата форматируется в UTC: это день из окна записи, а не момент
 * времени, и сдвигать его часовым поясом нельзя.
 */
export function formatDayLabel(isoDate: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

/** `2026-08-05T11:00:00Z` → `11:00` в указанном (по умолчанию местном) поясе. */
export function formatTime(isoDateTime: string, timeZone: string = currentTimeZone()): string {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(isoDateTime));
}

/** `11:00 – 11:30` */
export function formatTimeRange(
  startAt: string,
  endAt: string,
  timeZone: string = currentTimeZone(),
): string {
  return `${formatTime(startAt, timeZone)} – ${formatTime(endAt, timeZone)}`;
}

/** `среда, 5 августа 2026 г. в 11:00` */
export function formatDateTimeLong(
  isoDateTime: string,
  timeZone: string = currentTimeZone(),
): string {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(isoDateTime));
}

/**
 * `2026-08-05T22:30:00Z` → `2026-08-06` в поясе `Europe/Minsk`.
 * Ключ группировки броней по календарному дню: локаль `en-CA` отдаёт готовый
 * `YYYY-MM-DD`, поэтому арифметика со смещениями пояса не нужна.
 */
export function localDateKey(isoDateTime: string, timeZone: string = currentTimeZone()): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).format(new Date(isoDateTime));
}

/**
 * `2026-08-05T11:00:00Z` → `среда, 5 августа`.
 * В отличие от `formatDayLabel` берёт момент времени и считает день
 * в местном поясе, а не календарную дату в UTC.
 */
export function formatDateLong(isoDateTime: string, timeZone: string = currentTimeZone()): string {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone,
  }).format(new Date(isoDateTime));
}

/** «среда, 5 августа» → «Среда, 5 августа»: заглавная только первая буква. */
export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

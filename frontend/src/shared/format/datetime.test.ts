import { describe, expect, it } from 'vitest';

import {
  currentTimeZone,
  formatDateLong,
  formatDateTimeLong,
  formatDayLabel,
  formatTime,
  formatTimeRange,
  localDateKey,
} from './datetime';

describe('formatDayLabel', () => {
  it('показывает день недели, число и месяц', () => {
    expect(formatDayLabel('2026-08-05')).toBe('ср, 5 авг.');
  });

  it('трактует дату как календарную и не сдвигает её часовым поясом', () => {
    expect(formatDayLabel('2026-01-01')).toBe('чт, 1 янв.');
  });
});

describe('formatTime', () => {
  it('форматирует время в указанном часовом поясе', () => {
    expect(formatTime('2026-08-05T11:00:00Z', 'UTC')).toBe('11:00');
    expect(formatTime('2026-08-05T11:00:00Z', 'Europe/Minsk')).toBe('14:00');
  });

  it('по умолчанию использует часовой пояс окружения', () => {
    expect(formatTime('2026-08-05T11:00:00Z')).toBe('11:00');
    expect(currentTimeZone()).toBe('UTC');
  });
});

describe('formatTimeRange', () => {
  it('соединяет начало и конец тире', () => {
    expect(formatTimeRange('2026-08-05T11:00:00Z', '2026-08-05T11:30:00Z', 'UTC')).toBe(
      '11:00 – 11:30',
    );
  });
});

describe('formatDateTimeLong', () => {
  it('пишет дату словами и время', () => {
    expect(formatDateTimeLong('2026-08-05T11:00:00Z', 'UTC')).toBe(
      'среда, 5 августа 2026 г. в 11:00',
    );
  });
});

describe('localDateKey', () => {
  it('даёт календарный день в указанном поясе', () => {
    expect(localDateKey('2026-08-05T11:00:00Z', 'UTC')).toBe('2026-08-05');
  });

  it('учитывает сдвиг пояса на границе суток', () => {
    expect(localDateKey('2026-08-05T22:30:00Z', 'Europe/Minsk')).toBe('2026-08-06');
  });
});

describe('formatDateLong', () => {
  it('пишет день недели, число и месяц словами', () => {
    expect(formatDateLong('2026-08-05T11:00:00Z', 'UTC')).toBe('среда, 5 августа');
  });
});

// Моковые данные для Prism: типы событий, окно свободных слотов, брони и ошибки.
// Только чистые функции — никакого чтения и записи файлов.

const WORK_DAY_START_HOUR = 10; // рабочий день по UTC: 10:00 … 18:00
const WORK_DAY_END_HOUR = 18;
const WINDOW_DAYS = 14; // окно записи из контракта: 14 дней от текущей даты
const LEAD_TIME_MINUTES = 5; // слоты, до которых осталось меньше этого времени, свободными не считаются
const MINUTE = 60 * 1000;

export const eventTypes = [
  {
    id: 'intro-call',
    name: 'Знакомство',
    description: 'Короткий созвон, чтобы обсудить задачу и понять, чем я могу помочь.',
    durationMinutes: 30,
  },
  {
    id: 'design-review',
    name: 'Ревью дизайна',
    description: 'Разбираем макеты и прототипы, собираем список правок.',
    durationMinutes: 60,
  },
  {
    id: 'coffee-chat',
    name: 'Кофе-чат',
    description: 'Неформальный разговор без повестки.',
    durationMinutes: 15,
  },
];

function toIsoSeconds(date) {
  return `${date.toISOString().slice(0, 19)}Z`;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * MINUTE);
}

function isWeekend(date) {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

// Слот считается занятым по детерминированному правилу — чтобы календарь
// выглядел живым (дырки в сетке), но данные не менялись между сборками.
function isBooked(dayIndex, slotIndex) {
  return (dayIndex * 3 + slotIndex) % 5 === 0;
}

// Свободные слоты одного дня: рабочие часы с шагом в длительность типа события.
// Выходные пустые; для сегодняшнего дня слоты, которые вот-вот начнутся или уже
// начались, отбрасываются.
function buildDaySlots(dayStart, durationMinutes, dayIndex, now) {
  if (isWeekend(dayStart)) {
    return [];
  }

  const earliestStart = new Date(now.getTime() + LEAD_TIME_MINUTES * MINUTE);
  const slots = [];
  const dayEnd = new Date(dayStart.getTime() + WORK_DAY_END_HOUR * 60 * MINUTE);
  let slotStart = new Date(dayStart.getTime() + WORK_DAY_START_HOUR * 60 * MINUTE);
  let slotIndex = 0;

  while (true) {
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * MINUTE);
    if (slotEnd > dayEnd) {
      break;
    }
    if (!isBooked(dayIndex, slotIndex) && slotStart > earliestStart) {
      slots.push({ startAt: toIsoSeconds(slotStart), endAt: toIsoSeconds(slotEnd) });
    }
    slotStart = slotEnd;
    slotIndex += 1;
  }

  return slots;
}

/**
 * Окно свободных слотов типа события: 14 дней, начиная с текущей даты.
 * Присутствуют все дни окна, включая дни без свободных слотов.
 */
export function buildAvailability(eventType, now) {
  const windowStart = startOfUtcDay(now);
  const days = [];

  for (let dayIndex = 0; dayIndex < WINDOW_DAYS; dayIndex += 1) {
    const dayStart = addDays(windowStart, dayIndex);
    days.push({
      date: toIsoDate(dayStart),
      slots: buildDaySlots(dayStart, eventType.durationMinutes, dayIndex, now),
    });
  }

  return {
    eventTypeId: eventType.id,
    slotDurationMinutes: eventType.durationMinutes,
    windowStartDate: toIsoDate(windowStart),
    windowEndDate: toIsoDate(addDays(windowStart, WINDOW_DAYS - 1)),
    days,
  };
}

// Слот для брони с номером index. Брони разводятся по разным дням, иначе мок
// нарушал бы собственное правило занятости: две встречи на одно время.
function freeSlot(eventType, now, index = 0) {
  const daysWithSlots = buildAvailability(eventType, now).days.filter((day) => day.slots.length > 0);
  if (daysWithSlots.length === 0) {
    throw new Error(`Не удалось собрать свободный слот для типа события ${eventType.id}`);
  }

  const day = daysWithSlots[Math.min(index * 2, daysWithSlots.length - 1)];
  return day.slots[Math.min(index, day.slots.length - 1)];
}

/** Первый свободный слот типа события в окне записи. */
export function firstFreeSlot(eventType, now) {
  return freeSlot(eventType, now);
}

const guests = [
  { guestName: 'Анна Петрова', guestEmail: 'anna.petrova@example.com', comment: 'Хочу обсудить редизайн лендинга.' },
  { guestName: 'Игорь Северов', guestEmail: 'igor.severov@example.com' },
  { guestName: 'Мария Ли', guestEmail: 'maria.li@example.com', comment: 'Буду с коллегой.' },
];

// Идентификаторы броней зафиксированы: мок должен возвращать одно и то же
// при каждом запуске, случайные UUID только мешали бы отладке фронта.
const bookingIds = [
  '4f3a1c6e-59f1-4a0a-9d1f-4f6b0d2c1a01',
  '7c9e2d4b-2b77-4f8e-8a3c-2f1d5e6b7a02',
  'b1d8e5a3-6c14-4c9d-bf27-9a8c3d4e5f03',
];

/** Бронь на свободный слот указанного типа события. */
export function buildBooking(eventType, now, index = 0) {
  const slot = freeSlot(eventType, now, index);
  const guest = guests[index % guests.length];

  return {
    id: bookingIds[index % bookingIds.length],
    eventType,
    startAt: slot.startAt,
    endAt: slot.endAt,
    ...guest,
    createdAt: toIsoSeconds(now),
  };
}

/** Предстоящие встречи всех типов, по возрастанию времени начала. */
export function buildUpcomingBookings(now) {
  return eventTypes
    .map((eventType, index) => buildBooking(eventType, now, index))
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

/** Тело запроса на создание брони — согласовано со свободными слотами мока. */
export function buildCreateBookingRequest(now) {
  const eventType = eventTypes[0];
  const slot = firstFreeSlot(eventType, now);

  return {
    eventTypeId: eventType.id,
    startAt: slot.startAt,
    guestName: guests[0].guestName,
    guestEmail: guests[0].guestEmail,
    comment: guests[0].comment,
  };
}

export const newEventType = {
  id: 'strategy-session',
  name: 'Стратегическая сессия',
  description: 'Полтора часа на планирование квартала.',
  durationMinutes: 90,
};

export const errors = {
  notFound: {
    code: 'not_found',
    message: 'Тип события не найден.',
  },
  slotConflict: {
    code: 'slot_already_booked',
    message: 'Это время уже занято другой бронью. Обновите список свободных слотов.',
  },
  eventTypeConflict: {
    code: 'event_type_already_exists',
    message: 'Тип события с таким id уже существует.',
  },
  bookingValidation: {
    code: 'validation_failed',
    message: 'Запрос не прошёл валидацию.',
    errors: [
      { field: 'startAt', message: 'Время должно совпадать с началом свободного слота внутри окна записи.' },
      { field: 'guestEmail', message: 'Укажите корректный email.' },
    ],
  },
  eventTypeValidation: {
    code: 'validation_failed',
    message: 'Запрос не прошёл валидацию.',
    errors: [
      { field: 'id', message: 'Допустимы латиница в нижнем регистре, цифры и дефисы.' },
      { field: 'durationMinutes', message: 'Длительность должна быть от 1 до 1440 минут.' },
    ],
  },
};

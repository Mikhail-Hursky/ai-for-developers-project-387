import "@typespec/http";

using Http;

@service(#{ title: "Booking Calendar API" })
@server("http://localhost:3000/api", "Локальная разработка")
@doc("""
  HTTP API календаря бронирования.

  В системе две условные роли без регистрации и авторизации:
  - **Владелец календаря** — один заранее заданный профиль. Создаёт типы событий
    и просматривает единый список предстоящих встреч (ручки с префиксом `/admin`).
  - **Гость** — бронирует слоты без аккаунта и входа в систему.

  Правило занятости: на одно и то же время нельзя создать две брони,
  даже если это разные типы событий.

  Окно записи: свободные слоты формируются на 14 дней, начиная с текущей даты.
  Гость может записаться только на свободный слот из этого окна.
  """)
namespace BookingCalendar;

// ===================== Скаляры =====================

@doc("""
  Идентификатор типа события. Задаётся владельцем при создании
  (латиница в нижнем регистре, цифры и дефисы), например `intro-call`.
  """)
@pattern("^[a-z0-9]+(-[a-z0-9]+)*$")
@minLength(1)
@maxLength(100)
scalar EventTypeId extends string;

@doc("Идентификатор бронирования. Генерируется сервером (UUID).")
@format("uuid")
scalar BookingId extends string;

// ===================== Модели =====================

@doc("Тип события, который создаёт владелец календаря.")
model EventType {
  id: EventTypeId;

  @doc("Название типа события.")
  @minLength(1)
  @maxLength(150)
  name: string;

  @doc("Описание типа события.")
  @maxLength(2000)
  description: string;

  @doc("Длительность события в минутах. Определяет длину слота.")
  @minValue(1)
  @maxValue(1440)
  durationMinutes: int32;
}

@doc("Данные для создания типа события. Все поля задаёт владелец, включая `id`.")
model CreateEventTypeRequest {
  ...EventType;
}

@doc("Свободный слот для записи.")
model Slot {
  @doc("Начало слота (UTC).")
  startAt: utcDateTime;

  @doc("Конец слота (UTC): `startAt` + длительность типа события.")
  endAt: utcDateTime;
}

@doc("Свободные слоты одного дня.")
model DayAvailability {
  @doc("Календарная дата дня.")
  date: plainDate;

  @doc("""
    Свободные слоты дня по возрастанию времени начала.
    Пустой массив — свободных слотов в этот день нет.
    """)
  slots: Slot[];
}

@doc("Свободные слоты типа события в окне записи.")
model Availability {
  eventTypeId: EventTypeId;

  @doc("Длительность одного слота в минутах (равна длительности типа события).")
  @minValue(1)
  @maxValue(1440)
  slotDurationMinutes: int32;

  @doc("Первый день окна записи — текущая дата.")
  windowStartDate: plainDate;

  @doc("Последний день окна записи — текущая дата + 13 дней (всего 14 дней).")
  windowEndDate: plainDate;

  @doc("Все 14 дней окна записи по порядку, включая дни без свободных слотов.")
  days: DayAvailability[];
}

@doc("Данные гостя, указанные при бронировании.")
model GuestInfo {
  @doc("Имя гостя.")
  @minLength(1)
  @maxLength(200)
  guestName: string;

  @doc("Email гостя для связи.")
  @format("email")
  @maxLength(320)
  guestEmail: string;

  @doc("Необязательный комментарий гостя к встрече.")
  @maxLength(1000)
  comment?: string;
}

@doc("Данные, которые гость передаёт при создании брони.")
model CreateBookingRequest {
  @doc("Тип события, на который записывается гость.")
  eventTypeId: EventTypeId;

  @doc("""
    Начало брони (UTC). Должно точно совпадать со `startAt` одного из свободных
    слотов, полученных из `GET /event-types/{eventTypeId}/slots`.
    """)
  startAt: utcDateTime;

  ...GuestInfo;
}

@doc("Созданное бронирование.")
model Booking {
  id: BookingId;

  @doc("Тип события, к которому относится бронь.")
  eventType: EventType;

  @doc("Начало встречи (UTC).")
  startAt: utcDateTime;

  @doc("Конец встречи (UTC): `startAt` + длительность типа события.")
  endAt: utcDateTime;

  ...GuestInfo;

  @doc("Момент создания брони (UTC).")
  createdAt: utcDateTime;
}

// ===================== Ошибки =====================

@doc("Ресурс не найден.")
@error
model NotFoundError {
  @statusCode statusCode: 404;

  @doc("Машиночитаемый код ошибки.")
  code: "not_found";

  @doc("Человекочитаемое описание ошибки.")
  message: string;
}

@doc("""
  Время уже занято другой бронью — правило занятости: на одно и то же время
  нельзя создать две записи, даже если это разные типы событий.
  """)
@error
model SlotConflictError {
  @statusCode statusCode: 409;
  code: "slot_already_booked";
  message: string;
}

@doc("Тип события с таким `id` уже существует.")
@error
model EventTypeConflictError {
  @statusCode statusCode: 409;
  code: "event_type_already_exists";
  message: string;
}

@doc("Ошибка в одном из полей запроса.")
model FieldError {
  @doc("Имя поля с ошибкой, например `startAt`.")
  field: string;

  @doc("Описание проблемы с полем.")
  message: string;
}

@doc("""
  Запрос не прошёл валидацию: значения полей отсутствуют, имеют неверный
  формат или нарушают ограничения. Детали по конкретным полям — в `errors`.
  """)
@error
model ValidationError {
  @statusCode statusCode: 422;
  code: "validation_failed";
  message: string;

  @doc("Список ошибок по полям.")
  errors?: FieldError[];
}

// ===================== Ручки гостя =====================

@tag("Гость: типы событий и слоты")
@route("/event-types")
interface EventTypes {
  @summary("Список типов событий")
  @doc("""
    Страница с видами брони: гостю доступны название, описание и длительность
    каждого типа события. Владелец использует этот же список в админской части.
    """)
  @get
  list(): EventType[];

  @summary("Тип события по идентификатору")
  @doc("Данные одного типа события — для страницы бронирования.")
  @get
  get(@path eventTypeId: EventTypeId): EventType | NotFoundError;

  @summary("Свободные слоты типа события на 14 дней")
  @doc("""
    Календарь свободных слотов выбранного типа события на 14 дней,
    начиная с текущей даты. Слоты, время которых пересекается с любой
    существующей бронью (любого типа события), не возвращаются.
    """)
  @get
  @route("/{eventTypeId}/slots")
  listSlots(@path eventTypeId: EventTypeId): Availability | NotFoundError;
}

@tag("Гость: бронирование")
@route("/bookings")
interface Bookings {
  @summary("Создать бронирование")
  @doc("""
    Гость бронирует выбранный свободный слот без создания аккаунта.

    Сервер проверяет:
    - тип события существует (иначе 404);
    - `startAt` лежит на сетке слотов этого типа события, внутри окна записи
      (14 дней от текущей даты) и не в прошлом (иначе 422);
    - время не пересекается ни с одной существующей бронью любого типа
      события (иначе 409) — в том числе когда слот заняли, пока гость
      выбирал: получив 409, фронту следует перезапросить свободные слоты.
    """)
  @post
  create(@body request: CreateBookingRequest): {
    @statusCode statusCode: 201;
    @body booking: Booking;
  } | NotFoundError | SlotConflictError | ValidationError;
}

// ===================== Ручки владельца =====================

@tag("Владелец: админская часть")
@route("/admin")
interface Admin {
  @summary("Создать тип события")
  @doc("""
    Владелец создаёт тип события, задавая `id`, название, описание
    и длительность в минутах.
    """)
  @post
  @route("/event-types")
  createEventType(@body request: CreateEventTypeRequest): {
    @statusCode statusCode: 201;
    @body eventType: EventType;
  } | EventTypeConflictError | ValidationError;

  @summary("Предстоящие встречи")
  @doc("""
    Единый список предстоящих броней по всем типам событий:
    брони с `startAt` не раньше текущего момента,
    отсортированные по возрастанию времени начала.
    """)
  @get
  @route("/bookings/upcoming")
  listUpcomingBookings(): Booking[];
}

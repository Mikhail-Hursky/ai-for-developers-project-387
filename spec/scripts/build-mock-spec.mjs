// Собирает openapi/openapi.mock.yaml — копию контракта с примерами ответов
// для Prism. Даты примеров считаются от момента запуска, поэтому окно записи
// всегда лежит в будущем. Исходный openapi.yaml не меняется.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parse, stringify } from 'yaml';

import {
  buildAvailability,
  buildCreateBookingRequest,
  buildBooking,
  buildUpcomingBookings,
  errors,
  eventTypes,
  newEventType,
} from './mock-fixtures.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const sourcePath = resolve(scriptDir, '../openapi/openapi.yaml');
const targetPath = resolve(scriptDir, '../openapi/openapi.mock.yaml');

const MOCK_SERVER_URL = 'http://localhost:4010';
const MEDIA_TYPE = 'application/json';

const byEventTypeId = (build) =>
  Object.fromEntries(eventTypes.map((eventType) => [eventType.id, build(eventType)]));

// Карта примеров: путь → метод → тело запроса и ответы по кодам.
// Первый пример каждого ответа Prism отдаёт по умолчанию, остальные
// доступны через заголовок `Prefer: example=<имя>`.
function buildExamples(now) {
  return {
    '/event-types': {
      get: {
        responses: {
          200: { default: eventTypes },
        },
      },
    },
    '/event-types/{eventTypeId}': {
      get: {
        responses: {
          200: byEventTypeId((eventType) => eventType),
          404: { default: errors.notFound },
        },
      },
    },
    '/event-types/{eventTypeId}/slots': {
      get: {
        responses: {
          200: byEventTypeId((eventType) => buildAvailability(eventType, now)),
          404: { default: errors.notFound },
        },
      },
    },
    '/bookings': {
      post: {
        request: { default: buildCreateBookingRequest(now) },
        responses: {
          201: { default: buildBooking(eventTypes[0], now) },
          404: { default: errors.notFound },
          409: { default: errors.slotConflict },
          422: { default: errors.bookingValidation },
        },
      },
    },
    '/admin/event-types': {
      post: {
        request: { default: newEventType },
        responses: {
          201: { default: newEventType },
          409: { default: errors.eventTypeConflict },
          422: { default: errors.eventTypeValidation },
        },
      },
    },
    '/admin/bookings/upcoming': {
      get: {
        responses: {
          200: { default: buildUpcomingBookings(now) },
        },
      },
    },
  };
}

function toOpenApiExamples(examples) {
  return Object.fromEntries(
    Object.entries(examples).map(([name, value]) => [name, { value }]),
  );
}

// Примеры кладутся только в существующие места контракта: если ручка или код
// ответа исчезли из спеки, сборка падает, а не отдаёт молча старые данные.
function attachExamples(mediaTypeObject, examples, location) {
  if (!mediaTypeObject) {
    throw new Error(`В openapi.yaml нет ${MEDIA_TYPE} для ${location} — обновите карту примеров`);
  }
  mediaTypeObject.examples = toOpenApiExamples(examples);
}

function applyExamples(document, examplesByPath) {
  for (const [path, methods] of Object.entries(examplesByPath)) {
    const pathItem = document.paths?.[path];
    if (!pathItem) {
      throw new Error(`В openapi.yaml нет пути ${path} — обновите карту примеров`);
    }

    for (const [method, { request, responses }] of Object.entries(methods)) {
      const operation = pathItem[method];
      if (!operation) {
        throw new Error(`В openapi.yaml нет ${method.toUpperCase()} ${path} — обновите карту примеров`);
      }

      if (request) {
        attachExamples(operation.requestBody?.content?.[MEDIA_TYPE], request, `тела запроса ${method.toUpperCase()} ${path}`);
      }

      for (const [code, examples] of Object.entries(responses)) {
        const response = operation.responses?.[code];
        if (!response) {
          throw new Error(`В openapi.yaml нет ответа ${code} для ${method.toUpperCase()} ${path} — обновите карту примеров`);
        }
        attachExamples(response.content?.[MEDIA_TYPE], examples, `ответа ${code} на ${method.toUpperCase()} ${path}`);
      }
    }
  }
}

const now = new Date();
const document = parse(await readFile(sourcePath, 'utf8'));

applyExamples(document, buildExamples(now));

document.servers = [{ url: MOCK_SERVER_URL, description: 'Мок-сервер Prism' }];
document.info.description = `${document.info.description}\n\nМок-версия спецификации: примеры сгенерированы ${now.toISOString()}.`;

await writeFile(targetPath, stringify(document, { lineWidth: 0 }), 'utf8');

console.log(`Мок-спецификация собрана: ${targetPath}`);

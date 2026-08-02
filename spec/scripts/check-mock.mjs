// Smoke-проверка мока: поднимает Prism на отдельном порту, дёргает все ручки
// и проверяет коды ответов, форму данных и актуальность дат.
// Тест-раннера в проекте нет, поэтому обычный скрипт с node:assert.

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const prismBin = resolve(scriptDir, '../node_modules/.bin/prism');
const specPath = resolve(scriptDir, '../openapi/openapi.mock.yaml');

const port = Number(process.env.MOCK_CHECK_PORT ?? 4011);
const baseUrl = `http://127.0.0.1:${port}`;
const STARTUP_TIMEOUT_MS = 30_000;

const checks = [];

function check(description, fn) {
  checks.push({ description, fn });
}

async function request(path, { method = 'GET', body, prefer } = {}) {
  const headers = {};
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
  }
  if (prefer) {
    headers.prefer = prefer;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return { status: response.status, body: await response.json() };
}

function todayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

const validBooking = {
  eventTypeId: 'intro-call',
  startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  guestName: 'Проверка мока',
  guestEmail: 'check@example.com',
};

check('GET /event-types отдаёт три типа события', async () => {
  const { status, body } = await request('/event-types');
  assert.equal(status, 200);
  assert.deepEqual(
    body.map((eventType) => eventType.id),
    ['intro-call', 'design-review', 'coffee-chat'],
  );
});

check('GET /event-types/{id} с Prefer: example отдаёт нужный тип', async () => {
  const { status, body } = await request('/event-types/design-review', { prefer: 'example=design-review' });
  assert.equal(status, 200);
  assert.equal(body.id, 'design-review');
  assert.equal(body.durationMinutes, 60);
});

check('GET /event-types/{id} с Prefer: code=404 отдаёт not_found', async () => {
  const { status, body } = await request('/event-types/unknown', { prefer: 'code=404' });
  assert.equal(status, 404);
  assert.equal(body.code, 'not_found');
});

check('GET /event-types/{id}/slots отдаёт окно из 14 дней, начиная с сегодня', async () => {
  const { status, body } = await request('/event-types/intro-call/slots');
  assert.equal(status, 200);
  assert.equal(body.eventTypeId, 'intro-call');
  assert.equal(body.slotDurationMinutes, 30);
  assert.equal(body.days.length, 14);
  assert.equal(body.windowStartDate, todayUtcDate());
  assert.equal(body.days[0].date, body.windowStartDate);
  assert.equal(body.days.at(-1).date, body.windowEndDate);
});

check('все слоты лежат в будущем и внутри окна записи', async () => {
  const { body } = await request('/event-types/coffee-chat/slots');
  const now = Date.now();
  const windowEnd = Date.parse(`${body.windowEndDate}T23:59:59Z`);
  const slots = body.days.flatMap((day) => day.slots);

  assert.ok(slots.length > 0, 'в окне записи не оказалось ни одного свободного слота');
  for (const slot of slots) {
    const startAt = Date.parse(slot.startAt);
    assert.ok(startAt > now, `слот ${slot.startAt} уже в прошлом`);
    assert.ok(startAt <= windowEnd, `слот ${slot.startAt} вне окна записи`);
    assert.ok(Date.parse(slot.endAt) > startAt, `у слота ${slot.startAt} некорректный endAt`);
  }
});

check('POST /bookings создаёт бронь', async () => {
  const { status, body } = await request('/bookings', { method: 'POST', body: validBooking });
  assert.equal(status, 201);
  assert.equal(body.eventType.id, 'intro-call');
  assert.match(body.id, /^[0-9a-f-]{36}$/);
  assert.ok(Date.parse(body.startAt) > Date.now(), 'бронь создана на прошедшее время');
});

check('POST /bookings с Prefer: code=409 отдаёт slot_already_booked', async () => {
  const { status, body } = await request('/bookings', { method: 'POST', body: validBooking, prefer: 'code=409' });
  assert.equal(status, 409);
  assert.equal(body.code, 'slot_already_booked');
});

check('POST /bookings с невалидным телом отдаёт 422', async () => {
  const { status } = await request('/bookings', { method: 'POST', body: { eventTypeId: 'intro-call' } });
  assert.equal(status, 422);
});

check('POST /admin/event-types создаёт тип события', async () => {
  const { status, body } = await request('/admin/event-types', {
    method: 'POST',
    body: { id: 'strategy-session', name: 'Стратегическая сессия', description: 'Планирование квартала.', durationMinutes: 90 },
  });
  assert.equal(status, 201);
  assert.equal(body.id, 'strategy-session');
});

check('GET /admin/bookings/upcoming отдаёт брони по возрастанию startAt', async () => {
  const { status, body } = await request('/admin/bookings/upcoming');
  assert.equal(status, 200);
  assert.equal(body.length, 3);

  const startTimes = body.map((booking) => Date.parse(booking.startAt));
  assert.deepEqual(startTimes, [...startTimes].sort((a, b) => a - b), 'брони не отсортированы по времени начала');
  for (const startAt of startTimes) {
    assert.ok(startAt > Date.now(), 'в списке предстоящих есть прошедшая встреча');
  }
});

check('брони в upcoming не пересекаются по времени', async () => {
  const { body } = await request('/admin/bookings/upcoming');

  for (let i = 1; i < body.length; i += 1) {
    const previousEnd = Date.parse(body[i - 1].endAt);
    const currentStart = Date.parse(body[i].startAt);
    assert.ok(
      currentStart >= previousEnd,
      `бронь ${body[i].startAt} пересекается с предыдущей, которая длится до ${body[i - 1].endAt}`,
    );
  }
});

async function waitForMock(child) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Prism завершился с кодом ${child.exitCode} до готовности`);
    }
    try {
      const response = await fetch(`${baseUrl}/event-types`);
      if (response.ok) {
        return;
      }
    } catch {
      // сервер ещё поднимается
    }
    await new Promise((done) => setTimeout(done, 300));
  }

  throw new Error(`Prism не ответил за ${STARTUP_TIMEOUT_MS} мс`);
}

const child = spawn(prismBin, ['mock', specPath, '--port', String(port), '--errors'], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

const prismLog = [];
child.stdout.on('data', (chunk) => prismLog.push(chunk.toString()));
child.stderr.on('data', (chunk) => prismLog.push(chunk.toString()));

let failed = 0;

try {
  await waitForMock(child);

  for (const { description, fn } of checks) {
    try {
      await fn();
      console.log(`  ok  ${description}`);
    } catch (error) {
      failed += 1;
      console.error(`fail  ${description}`);
      console.error(`      ${error.message}`);
    }
  }
} catch (error) {
  failed += 1;
  console.error(error.message);
  console.error(prismLog.join(''));
} finally {
  child.kill('SIGTERM');
}

if (failed > 0) {
  console.error(`\nПроверок провалено: ${failed} из ${checks.length}`);
  process.exit(1);
}

console.log(`\nВсе проверки пройдены: ${checks.length}`);

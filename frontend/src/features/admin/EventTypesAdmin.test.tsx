import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { INTRO_CALL, STRATEGY_SESSION } from '../../test/fixtures';
import { renderUi } from '../../test/renderUi';
import { stubFetch } from '../../test/stubFetch';
import { EventTypesAdmin } from './EventTypesAdmin';

afterEach(() => {
  vi.unstubAllGlobals();
});

async function fillNewType(user: ReturnType<typeof userEvent.setup>, id = 'strategy-session') {
  await user.click(await screen.findByRole('button', { name: 'Создать тип' }));
  await user.type(screen.getByLabelText(/Идентификатор/), id);
  await user.type(screen.getByLabelText(/Название/), 'Стратегическая сессия');
  await user.clear(screen.getByLabelText(/Длительность/));
  await user.type(screen.getByLabelText(/Длительность/), '90');
  await user.click(screen.getByRole('button', { name: 'Создать' }));
}

describe('EventTypesAdmin', () => {
  it('показывает существующие типы с идентификатором', async () => {
    stubFetch({ eventTypes: () => Response.json([INTRO_CALL]) });

    renderUi(<EventTypesAdmin />);

    expect(await screen.findByText('Знакомство')).toBeInTheDocument();
    expect(screen.getByText('intro-call')).toBeInTheDocument();
    expect(screen.getByText('30 мин')).toBeInTheDocument();
  });

  it('шлёт POST и дописывает созданный тип в список', async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch({
      eventTypes: () => Response.json([INTRO_CALL]),
      createEventType: () => Response.json(STRATEGY_SESSION, { status: 201 }),
    });

    renderUi(<EventTypesAdmin />);
    await fillNewType(user);

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some((call) => String(call[0]).endsWith('/admin/event-types')),
      ).toBe(true),
    );

    const call = fetchMock.mock.calls.find((item) =>
      String(item[0]).endsWith('/admin/event-types'),
    );
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({
      id: 'strategy-session',
      name: 'Стратегическая сессия',
      description: '',
      durationMinutes: 90,
    });

    expect(await screen.findByText('Тип встречи «Стратегическая сессия» создан.')).toBeInTheDocument();
    expect(screen.getByText('strategy-session')).toBeInTheDocument();
  });

  it('дедуплицирует по id повторное создание, когда мок отдаёт одну и ту же фикстуру', async () => {
    const user = userEvent.setup();
    stubFetch({
      eventTypes: () => Response.json([INTRO_CALL]),
      createEventType: () => Response.json(STRATEGY_SESSION, { status: 201 }),
    });

    renderUi(<EventTypesAdmin />);

    await fillNewType(user);
    expect(await screen.findByText('Тип встречи «Стратегическая сессия» создан.')).toBeInTheDocument();

    await fillNewType(user, 'strategy-session-2');
    expect(await screen.findByText('Тип встречи «Стратегическая сессия» создан.')).toBeInTheDocument();

    expect(screen.getAllByText('strategy-session')).toHaveLength(1);
  });

  it('после 409 показывает ошибку под полем идентификатора', async () => {
    const user = userEvent.setup();
    stubFetch({
      eventTypes: () => Response.json([INTRO_CALL]),
      createEventType: () =>
        Response.json(
          {
            code: 'event_type_already_exists',
            message: 'Тип события с таким id уже существует.',
          },
          { status: 409 },
        ),
    });

    renderUi(<EventTypesAdmin />);
    await fillNewType(user);

    expect(await screen.findByText('Тип события с таким id уже существует.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Создать' })).toBeInTheDocument();
  });

  it('сообщает, что типов пока нет', async () => {
    stubFetch({ eventTypes: () => Response.json([]) });

    renderUi(<EventTypesAdmin />);

    expect(await screen.findByText('Типы встреч пока не созданы.')).toBeInTheDocument();
  });
});

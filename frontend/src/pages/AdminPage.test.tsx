import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { INTRO_CALL, upcomingBookingsFixture } from '../test/fixtures';
import { renderApp } from '../test/renderApp';
import { stubFetch } from '../test/stubFetch';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AdminPage', () => {
  it('по умолчанию открывает предстоящие встречи', async () => {
    stubFetch({ upcomingBookings: () => Response.json(upcomingBookingsFixture()) });

    renderApp('/admin');

    expect(screen.getByRole('heading', { name: 'Админка', level: 1 })).toBeInTheDocument();
    expect(await screen.findByText('Анна Петрова')).toBeInTheDocument();
  });

  it('по клику на вкладку показывает типы встреч', async () => {
    const user = userEvent.setup();
    stubFetch({
      upcomingBookings: () => Response.json([]),
      eventTypes: () => Response.json([INTRO_CALL]),
    });

    renderApp('/admin');
    await user.click(screen.getByRole('tab', { name: 'Типы встреч' }));

    expect(await screen.findByRole('button', { name: 'Создать тип' })).toBeInTheDocument();
    expect(await screen.findByText('intro-call')).toBeInTheDocument();
  });

  it('открывает вкладку типов встреч по параметру адреса', async () => {
    stubFetch({ eventTypes: () => Response.json([INTRO_CALL]) });

    renderApp('/admin?tab=event-types');

    expect(await screen.findByText('Знакомство')).toBeInTheDocument();
  });

  it('неизвестное значение параметра трактует как вкладку по умолчанию', async () => {
    stubFetch({ upcomingBookings: () => Response.json(upcomingBookingsFixture()) });

    renderApp('/admin?tab=nope');

    expect(await screen.findByText('Анна Петрова')).toBeInTheDocument();
  });
});

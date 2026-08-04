import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { upcomingBookingsFixture } from '../../test/fixtures';
import { renderUi } from '../../test/renderUi';
import { stubFetch } from '../../test/stubFetch';
import { UpcomingBookings } from './UpcomingBookings';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('UpcomingBookings', () => {
  it('группирует встречи по дням и показывает гостя с типом события', async () => {
    stubFetch({ upcomingBookings: () => Response.json(upcomingBookingsFixture()) });

    renderUi(<UpcomingBookings />);

    expect(await screen.findByText('Среда, 5 августа')).toBeInTheDocument();
    expect(screen.getByText('Пятница, 7 августа')).toBeInTheDocument();
    expect(screen.getByText('11:00 – 11:30')).toBeInTheDocument();
    expect(screen.getAllByText('Знакомство · 30 мин').length).toBeGreaterThan(0);
    expect(screen.getByText('Анна Петрова')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'igor.severov@example.com' })).toHaveAttribute(
      'href',
      'mailto:igor.severov@example.com',
    );
  });

  it('сводит брони одного дня под один заголовок', async () => {
    stubFetch({ upcomingBookings: () => Response.json(upcomingBookingsFixture()) });

    renderUi(<UpcomingBookings />);

    const dayHeadings = await screen.findAllByRole('heading', { level: 2 });
    expect(dayHeadings.map((heading) => heading.textContent)).toEqual([
      'Среда, 5 августа',
      'Пятница, 7 августа',
    ]);
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('показывает комментарий гостя, если он есть', async () => {
    stubFetch({ upcomingBookings: () => Response.json(upcomingBookingsFixture()) });

    renderUi(<UpcomingBookings />);

    expect(await screen.findByText('Хочу обсудить редизайн лендинга.')).toBeInTheDocument();
  });

  it('сообщает, что встреч нет', async () => {
    stubFetch({ upcomingBookings: () => Response.json([]) });

    renderUi(<UpcomingBookings />);

    expect(await screen.findByText('Предстоящих встреч пока нет.')).toBeInTheDocument();
  });

  it('после ошибки повторяет запрос по кнопке', async () => {
    const user = userEvent.setup();
    let attempt = 0;
    const fetchMock = stubFetch({
      upcomingBookings: () => {
        attempt += 1;
        return attempt === 1
          ? Response.json({ code: 'unknown_error', message: 'Сбой' }, { status: 500 })
          : Response.json(upcomingBookingsFixture());
      },
    });

    renderUi(<UpcomingBookings />);

    expect(await screen.findByText(/Не удалось загрузить предстоящие встречи/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByText('Анна Петрова')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

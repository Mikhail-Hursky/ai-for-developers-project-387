import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderApp } from '../test/renderApp';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json([])),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Header', () => {
  it('показывает ссылки «Записаться» и «Админка»', () => {
    renderApp();

    const header = screen.getByRole('banner');
    expect(within(header).getByRole('link', { name: 'Записаться' })).toHaveAttribute(
      'href',
      '/booking',
    );
    expect(within(header).getByRole('link', { name: 'Админка' })).toHaveAttribute(
      'href',
      '/admin',
    );
  });

  it('ведёт логотипом на главную', () => {
    renderApp();

    expect(screen.getByRole('link', { name: /Calendar/ })).toHaveAttribute('href', '/');
  });
});

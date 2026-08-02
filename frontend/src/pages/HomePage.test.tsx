import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderApp } from '../test/renderApp';

describe('HomePage', () => {
  it('показывает заголовок, CTA и три карточки возможностей', () => {
    renderApp();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Запись на встречу');

    expect(screen.getByRole('link', { name: /Записаться →/ })).toHaveAttribute('href', '/booking');

    const features = screen.getByRole('region', { name: 'Возможности' });
    expect(within(features).getAllByRole('heading', { level: 3 })).toHaveLength(3);
  });
});

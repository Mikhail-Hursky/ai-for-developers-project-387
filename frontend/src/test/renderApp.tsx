import { MantineProvider } from '@mantine/core';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import { App } from '../App';
import { theme } from '../theme';

export function renderApp(initialPath = '/'): RenderResult {
  return render(
    <MantineProvider theme={theme} env="test">
      <MemoryRouter initialEntries={[initialPath]}>
        <App />
      </MemoryRouter>
    </MantineProvider>,
  );
}

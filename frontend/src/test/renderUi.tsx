import { MantineProvider } from '@mantine/core';
import { render, type RenderResult } from '@testing-library/react';
import type { ReactNode } from 'react';

import { theme } from '../theme';

/** Рендер отдельного компонента без роутера — для вкладок админки и форм. */
export function renderUi(ui: ReactNode): RenderResult {
  return render(
    <MantineProvider theme={theme} env="test">
      {ui}
    </MantineProvider>,
  );
}

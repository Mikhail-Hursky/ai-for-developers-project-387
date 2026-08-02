import { Box } from '@mantine/core';
import { Outlet } from 'react-router';

import { Header } from './Header';

export function RootLayout() {
  return (
    <>
      <Header />
      <Box component="main">
        <Outlet />
      </Box>
    </>
  );
}

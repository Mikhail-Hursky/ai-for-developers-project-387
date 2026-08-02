import { Navigate, Route, Routes } from 'react-router';

import { RootLayout } from './layout/RootLayout';
import { AdminPage } from './pages/AdminPage';
import { BookingPage } from './pages/BookingPage';
import { HomePage } from './pages/HomePage';

export function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="booking" element={<BookingPage />} />
        <Route path="booking/:eventTypeId" element={<BookingPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

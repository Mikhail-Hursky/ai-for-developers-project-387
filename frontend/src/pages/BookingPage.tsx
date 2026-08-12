import { Navigate, useParams } from 'react-router';

import { BookingFlow } from '../features/booking/BookingFlow';

export function BookingPage() {
  const { eventTypeId } = useParams();

  if (!eventTypeId) {
    return <Navigate to="/booking" replace />;
  }

  // key: при смене типа встречи поток монтируется заново и не тащит
  // выбранные день и слот от предыдущего типа.
  return <BookingFlow key={eventTypeId} eventTypeId={eventTypeId} />;
}

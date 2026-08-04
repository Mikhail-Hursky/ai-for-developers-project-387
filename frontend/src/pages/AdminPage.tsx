import { Container, Stack, Tabs, Title } from '@mantine/core';
import { useSearchParams } from 'react-router';

import { EventTypesAdmin } from '../features/admin/EventTypesAdmin';
import { UpcomingBookings } from '../features/admin/UpcomingBookings';

const UPCOMING_TAB = 'upcoming';
const EVENT_TYPES_TAB = 'event-types';

export function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Неизвестное значение параметра трактуется как вкладка по умолчанию.
  const activeTab = searchParams.get('tab') === EVENT_TYPES_TAB ? EVENT_TYPES_TAB : UPCOMING_TAB;

  function handleTabChange(value: string | null) {
    setSearchParams(value === EVENT_TYPES_TAB ? { tab: EVENT_TYPES_TAB } : {}, { replace: true });
  }

  return (
    <Container size="lg" py={{ base: 32, md: 64 }}>
      <Stack gap="lg">
        <Title order={1}>Админка</Title>

        {/* keepMounted={false}: иначе неактивная вкладка тоже сходила бы в API. */}
        <Tabs value={activeTab} onChange={handleTabChange} keepMounted={false}>
          <Tabs.List mb="lg">
            <Tabs.Tab value={UPCOMING_TAB}>Предстоящие встречи</Tabs.Tab>
            <Tabs.Tab value={EVENT_TYPES_TAB}>Типы встреч</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value={UPCOMING_TAB}>
            <UpcomingBookings />
          </Tabs.Panel>

          <Tabs.Panel value={EVENT_TYPES_TAB}>
            <EventTypesAdmin />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}

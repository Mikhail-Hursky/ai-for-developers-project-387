import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertTriangle, IconArrowRight } from '@tabler/icons-react';
import { Link } from 'react-router';

import { useEventTypes } from '../../shared/api/useEventTypes';

export function EventTypes() {
  const { data, isLoading, error, retry } = useEventTypes();

  return (
    <Container size="lg" component="section" aria-label="Типы встреч" py={{ base: 32, md: 64 }}>
      <Stack gap="xs" mb="xl">
        <Title order={2}>Типы встреч</Title>
        <Text c="dimmed">Выберите формат — дальше останется указать время.</Text>
      </Stack>

      {isLoading && (
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
          <Skeleton height={168} radius="lg" />
          <Skeleton height={168} radius="lg" />
          <Skeleton height={168} radius="lg" />
        </SimpleGrid>
      )}

      {!isLoading && error && (
        <Alert
          color="red"
          variant="light"
          radius="md"
          icon={<IconAlertTriangle size={20} />}
          title="Ошибка загрузки"
        >
          <Stack gap="sm" align="flex-start">
            <Text fz="sm">Не удалось загрузить типы встреч. Проверьте, запущен ли мок-сервер.</Text>
            <Button size="xs" variant="light" color="red" onClick={retry}>
              Повторить
            </Button>
          </Stack>
        </Alert>
      )}

      {!isLoading && !error && data?.length === 0 && (
        <Text c="dimmed">Типы встреч пока не созданы.</Text>
      )}

      {!isLoading && !error && data && data.length > 0 && (
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
          {data.map((eventType) => (
            <Card
              key={eventType.id}
              component={Link}
              to={`/booking/${eventType.id}`}
              padding="lg"
              radius="lg"
              withBorder
            >
              <Group justify="space-between" mb="xs" wrap="nowrap">
                <Title order={3} fz="lg">
                  {eventType.name}
                </Title>
                <Badge variant="light" radius="sm">
                  {eventType.durationMinutes} мин
                </Badge>
              </Group>

              <Text c="dimmed" fz="sm" mb="md" lineClamp={3}>
                {eventType.description}
              </Text>

              <Group gap={6} c="brand.7" fz="sm" fw={500} mt="auto">
                Записаться
                <IconArrowRight size={16} stroke={1.8} />
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Container>
  );
}

import { Card, Container, SimpleGrid, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCalendarEvent, IconSettings, IconUserCheck } from '@tabler/icons-react';

const FEATURES = [
  {
    icon: IconCalendarEvent,
    title: 'Удобное время',
    description: 'Выбор типа события и удобного времени для встречи.',
  },
  {
    icon: IconUserCheck,
    title: 'Бронь без аккаунта',
    description: 'Быстрое бронирование с подтверждением и дополнительными заметками.',
  },
  {
    icon: IconSettings,
    title: 'Всё под контролем',
    description: 'Управление типами встреч и просмотр предстоящих записей в админке.',
  },
];

export function Features() {
  return (
    <Container size="lg" component="section" aria-label="Возможности" py={{ base: 48, md: 80 }}>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
        {FEATURES.map((feature) => (
          <Card key={feature.title} padding="lg" radius="lg" withBorder>
            <ThemeIcon size={44} radius="md" variant="light" mb="md">
              <feature.icon size={24} stroke={1.6} />
            </ThemeIcon>
            <Title order={3} fz="lg" mb={6}>
              {feature.title}
            </Title>
            <Text c="dimmed" fz="sm">
              {feature.description}
            </Text>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  );
}

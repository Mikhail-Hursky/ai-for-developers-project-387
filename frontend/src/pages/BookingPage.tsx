import { Container, Stack, Text, Title } from '@mantine/core';

export function BookingPage() {
  return (
    <Container size="lg" py={80}>
      <Stack gap="xs" align="flex-start">
        <Title order={1}>Бронирование</Title>
        <Text c="dimmed">Скоро: выбор дня, времени и подтверждение записи.</Text>
      </Stack>
    </Container>
  );
}

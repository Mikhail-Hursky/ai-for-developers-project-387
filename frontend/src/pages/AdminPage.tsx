import { Container, Stack, Text, Title } from '@mantine/core';

export function AdminPage() {
  return (
    <Container size="lg" py={80}>
      <Stack gap="xs" align="flex-start">
        <Title order={1}>Админка</Title>
        <Text c="dimmed">Скоро: управление типами встреч и список предстоящих записей.</Text>
      </Stack>
    </Container>
  );
}

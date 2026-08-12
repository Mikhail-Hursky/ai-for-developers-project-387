import { Badge, Box, Button, Container, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';

import classes from './Hero.module.css';
import { SlotPreview } from './SlotPreview';

export function Hero() {
  return (
    <Box component="section" className={classes.hero} py={{ base: 48, md: 96 }}>
      <Container size="lg">
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={64} verticalSpacing={48}>
          <Stack gap="lg" justify="center" align="flex-start">
            <Badge size="lg" variant="light" radius="sm">
              Быстрая запись на звонок
            </Badge>

            <Title order={1} className={classes.title}>
              Запись на встречу
              <br />
              за пару кликов
            </Title>

            <Text c="dimmed" fz="lg" maw={480}>
              Выберите тип встречи, подходящее время в календаре и оставьте свои контакты. Ни
              регистрации, ни переписки о том, кому когда удобно.
            </Text>

            <Button component={Link} to="/booking" size="lg" radius="md">
              Записаться →
            </Button>
          </Stack>

          <SlotPreview />
        </SimpleGrid>
      </Container>
    </Box>
  );
}

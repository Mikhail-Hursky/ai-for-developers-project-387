import { Anchor, Button, Container, Group, Text } from '@mantine/core';
import { IconCalendarWeek } from '@tabler/icons-react';
import { Link } from 'react-router';

import classes from './Header.module.css';

export function Header() {
  return (
    <header className={classes.header}>
      <Container size="lg" className={classes.inner}>
        <Link to="/" className={classes.logo}>
          <IconCalendarWeek size={24} stroke={1.8} aria-hidden />
          <Text fw={700} fz="lg">
            Calendar
          </Text>
        </Link>

        <Group gap="sm" wrap="nowrap">
          <Anchor component={Link} to="/booking" c="dark" fw={500} underline="never" fz="sm">
            Записаться
          </Anchor>
          <Button component={Link} to="/admin" variant="outline" size="sm">
            Админка
          </Button>
        </Group>
      </Container>
    </header>
  );
}

import { Alert, Button, Card, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';

export interface GuestFormValues {
  guestName: string;
  guestEmail: string;
  comment: string;
}

interface GuestFormProps {
  slotLabel: string;
  isSubmitting: boolean;
  /** Общее сообщение об ошибке отправки; ошибки конкретных полей — в fieldErrors. */
  submitError: string | null;
  /** Ошибки по полям из ответа 422: имя поля → сообщение. */
  fieldErrors: Record<string, string>;
  onSubmit: (values: GuestFormValues) => void;
}

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export function GuestForm({
  slotLabel,
  isSubmitting,
  submitError,
  fieldErrors,
  onSubmit,
}: GuestFormProps) {
  const form = useForm<GuestFormValues>({
    initialValues: { guestName: '', guestEmail: '', comment: '' },
    validate: {
      guestName: (value) => {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
          return 'Укажите имя';
        }
        return trimmed.length > 200 ? 'Не больше 200 символов' : null;
      },
      guestEmail: (value) => (EMAIL_PATTERN.test(value.trim()) ? null : 'Укажите корректный email'),
      comment: (value) => (value.length > 1000 ? 'Не больше 1000 символов' : null),
    },
  });

  return (
    <Card withBorder radius="lg" padding="lg" mt="xl" maw={560}>
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap="md">
          <Text fw={500}>Вы выбрали: {slotLabel}</Text>

          <TextInput
            label="Имя"
            placeholder="Как к вам обращаться"
            withAsterisk
            {...form.getInputProps('guestName')}
            error={form.errors.guestName ?? fieldErrors.guestName}
          />

          <TextInput
            label="Email"
            placeholder="you@example.com"
            withAsterisk
            {...form.getInputProps('guestEmail')}
            error={form.errors.guestEmail ?? fieldErrors.guestEmail}
          />

          <Textarea
            label="Комментарий"
            placeholder="О чём хотите поговорить"
            autosize
            minRows={2}
            maxRows={6}
            {...form.getInputProps('comment')}
            error={form.errors.comment ?? fieldErrors.comment}
          />

          {submitError && (
            <Alert color="red" variant="light" radius="md">
              {submitError}
            </Alert>
          )}

          <Button type="submit" size="md" loading={isSubmitting}>
            Записаться
          </Button>
        </Stack>
      </form>
    </Card>
  );
}

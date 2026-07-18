'use client';

import {
  Alert,
  Button,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
} from '@heroui/react';
import { KeyRound, RefreshCw } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { ToolOutput } from './ToolOutput';

const MAX_UUIDS = 100;

export function UuidGeneratorTool() {
  const [amount, setAmount] = useState('5');
  const [uuids, setUuids] = useState<string[]>([]);
  const [error, setError] = useState<string>();

  function generateUuids() {
    const parsedAmount = Number.parseInt(amount, 10);

    if (
      !Number.isInteger(parsedAmount) ||
      parsedAmount < 1 ||
      parsedAmount > MAX_UUIDS
    ) {
      setError(`Укажи целое число от 1 до ${MAX_UUIDS}.`);
      return;
    }

    setUuids(Array.from({ length: parsedAmount }, () => crypto.randomUUID()));
    setError(undefined);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    generateUuids();
  }

  return (
    <div className="flex flex-col gap-4">
      <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TextField fullWidth name="amount" value={amount} onChange={setAmount}>
          <Label>Сколько UUID создать?</Label>
          <Input type="number" inputMode="numeric" min={1} max={MAX_UUIDS} />
          <Description>От 1 до {MAX_UUIDS} UUID v4 за один раз.</Description>
          <FieldError />
        </TextField>

        <Button className="self-start" type="submit">
          <KeyRound />
          Сгенерировать
        </Button>
      </Form>

      {error && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Проверь количество</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {uuids.length > 0 && (
        <div className="flex flex-col gap-2">
          <Button
            className="self-start"
            size="sm"
            variant="tertiary"
            onPress={generateUuids}
          >
            <RefreshCw />
            Сгенерировать ещё
          </Button>
          <ToolOutput
            content={uuids.join('\n')}
            label={`UUID v4 · ${uuids.length}`}
          />
        </div>
      )}
    </div>
  );
}

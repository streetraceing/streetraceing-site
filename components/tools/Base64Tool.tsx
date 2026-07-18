'use client';

import {
  Alert,
  Button,
  Description,
  FieldError,
  Form,
  Label,
  TextArea,
  TextField,
} from '@heroui/react';
import { ArrowLeftRight, LockKeyhole, UnlockKeyhole } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { ToolOutput } from './ToolOutput';

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function decodeBase64(value: string) {
  const binary = atob(value.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

export function Base64Tool() {
  const [source, setSource] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string>();

  function transform(direction: 'encode' | 'decode') {
    try {
      setOutput(
        direction === 'encode' ? encodeBase64(source) : decodeBase64(source),
      );
      setError(undefined);
    } catch {
      setOutput('');
      setError(
        direction === 'decode'
          ? 'Это не похоже на корректный Base64.'
          : 'Не удалось закодировать текст.',
      );
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    transform('encode');
  }

  return (
    <div className="flex flex-col gap-4">
      <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TextField
          isRequired
          fullWidth
          name="base64"
          value={source}
          onChange={setSource}
          validate={(value) =>
            value ? null : 'Вставь текст или Base64-строку.'
          }
        >
          <Label>Текст или Base64</Label>
          <TextArea
            variant="secondary"
            rows={10}
            placeholder="Например: Привет, мир!"
            spellCheck={false}
          />
          <Description>
            Кодирование UTF-8 выполняется локально в браузере.
          </Description>
          <FieldError />
        </TextField>

        <div className="flex flex-wrap gap-2">
          <Button type="submit">
            <LockKeyhole />В Base64
          </Button>
          <Button
            type="button"
            variant="secondary"
            onPress={() => transform('decode')}
          >
            <UnlockKeyhole />
            Из Base64
          </Button>
          <Button
            type="button"
            variant="tertiary"
            onPress={() => {
              setSource('Привет, мир!');
              setOutput('');
              setError(undefined);
            }}
          >
            <ArrowLeftRight />
            Пример
          </Button>
        </div>
      </Form>

      {error && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Не получилось обработать значение</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {output && <ToolOutput content={output} label="Результат Base64" />}
    </div>
  );
}

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
import { Braces, Minimize2, Sparkles } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { ToolOutput } from './ToolOutput';

const jsonExample =
  '{\n  "name": "streetraceing",\n  "tools": ["JSON Viewer", "UUID Generator"]\n}';

export function JsonViewerTool() {
  const [source, setSource] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string>();

  function transformJson(indent: number) {
    try {
      const parsed = JSON.parse(source);
      setOutput(JSON.stringify(parsed, null, indent));
      setError(undefined);
    } catch (caughtError) {
      setOutput('');
      setError(
        caughtError instanceof Error
          ? `Не удалось прочитать JSON: ${caughtError.message}`
          : 'Не удалось прочитать JSON.',
      );
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    transformJson(2);
  }

  return (
    <div className="flex flex-col gap-4">
      <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TextField
          isRequired
          fullWidth
          name="json"
          value={source}
          onChange={setSource}
          validate={(value) =>
            value.trim() ? null : 'Вставь JSON, который нужно проверить.'
          }
        >
          <Label>JSON</Label>
          <TextArea
            variant="secondary"
            rows={12}
            placeholder="Вставь JSON сюда…"
            spellCheck={false}
          />
          <Description>
            Данные обрабатываются только в этом браузере.
          </Description>
          <FieldError />
        </TextField>

        <div className="flex flex-wrap gap-2">
          <Button type="submit">
            <Braces />
            Форматировать
          </Button>
          <Button
            type="button"
            variant="secondary"
            onPress={() => transformJson(0)}
          >
            <Minimize2 />
            Минифицировать
          </Button>
          <Button
            type="button"
            variant="tertiary"
            onPress={() => {
              setSource(jsonExample);
              setOutput('');
              setError(undefined);
            }}
          >
            <Sparkles />
            Пример
          </Button>
        </div>
      </Form>

      {error && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Некорректный JSON</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {output && <ToolOutput content={output} label="Готовый JSON" />}
    </div>
  );
}

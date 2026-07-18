'use client';

import {
  Button,
  Chip,
  Description,
  Form,
  Label,
  TextArea,
  TextField,
} from '@heroui/react';
import {
  CaseLower,
  CaseUpper,
  ListFilter,
  Trash2,
  Waypoints,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { ToolOutput } from './ToolOutput';

type TextOperation =
  | 'uppercase'
  | 'lowercase'
  | 'trim-lines'
  | 'remove-empty-lines'
  | 'unique-lines';

function applyOperation(value: string, operation: TextOperation) {
  const lines = value.split(/\r?\n/);

  switch (operation) {
    case 'uppercase':
      return value.toUpperCase();
    case 'lowercase':
      return value.toLowerCase();
    case 'trim-lines':
      return lines.map((line) => line.trim()).join('\n');
    case 'remove-empty-lines':
      return lines.filter((line) => line.trim()).join('\n');
    case 'unique-lines':
      return [
        ...new Set(lines.map((line) => line.trim()).filter(Boolean)),
      ].join('\n');
  }
}

export function TextToolsTool() {
  const [source, setSource] = useState('');
  const [output, setOutput] = useState('');

  const textStats = useMemo(() => {
    const trimmedSource = source.trim();

    return {
      characters: source.length,
      words: trimmedSource ? trimmedSource.split(/\s+/).length : 0,
      lines: source ? source.split(/\r?\n/).length : 0,
    };
  }, [source]);

  function transformText(operation: TextOperation) {
    setOutput(applyOperation(source, operation));
  }

  return (
    <div className="flex flex-col gap-4">
      <Form
        className="flex flex-col gap-4"
        onSubmit={(event) => event.preventDefault()}
      >
        <TextField fullWidth name="text" value={source} onChange={setSource}>
          <Label>Текст</Label>
          <TextArea
            variant="secondary"
            rows={12}
            placeholder="Вставь или напиши текст…"
          />
          <Description>
            Результат появится ниже, исходный текст не изменится.
          </Description>
        </TextField>

        <div className="flex flex-wrap gap-2">
          <Chip size="sm" variant="secondary">
            Символов: {textStats.characters}
          </Chip>
          <Chip size="sm" variant="secondary">
            Слов: {textStats.words}
          </Chip>
          <Chip size="sm" variant="secondary">
            Строк: {textStats.lines}
          </Chip>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onPress={() => transformText('uppercase')}>
            <CaseUpper />В верхний регистр
          </Button>
          <Button
            type="button"
            variant="secondary"
            onPress={() => transformText('lowercase')}
          >
            <CaseLower />В нижний регистр
          </Button>
          <Button
            type="button"
            variant="secondary"
            onPress={() => transformText('trim-lines')}
          >
            <ListFilter />
            Очистить пробелы
          </Button>
          <Button
            type="button"
            variant="secondary"
            onPress={() => transformText('remove-empty-lines')}
          >
            <Trash2 />
            Убрать пустые строки
          </Button>
          <Button
            type="button"
            variant="tertiary"
            onPress={() => transformText('unique-lines')}
          >
            <Waypoints />
            Уникальные строки
          </Button>
        </div>
      </Form>

      {output && <ToolOutput content={output} />}
    </div>
  );
}

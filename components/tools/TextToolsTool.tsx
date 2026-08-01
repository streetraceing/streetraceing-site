'use client';

import { Button } from '@/components/ui/Button';
import { useLocale } from '@/app/providers';
import {
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
import { toolFieldClassName } from './toolStyles';

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
  const { copy } = useLocale();
  const strings = copy.tools.text;
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
          <Label>{strings.label}</Label>
          <TextArea
            variant="secondary"
            className={toolFieldClassName}
            rows={12}
            placeholder={strings.placeholder}
          />
          <Description>{strings.description}</Description>
        </TextField>

        <div className="flex flex-wrap gap-2">
          <Chip size="sm" variant="secondary">
            {strings.characters.replace(
              '{count}',
              String(textStats.characters),
            )}
          </Chip>
          <Chip size="sm" variant="secondary">
            {strings.words.replace('{count}', String(textStats.words))}
          </Chip>
          <Chip size="sm" variant="secondary">
            {strings.lines.replace('{count}', String(textStats.lines))}
          </Chip>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onPress={() => transformText('uppercase')}>
            <CaseUpper />
            {strings.uppercase}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onPress={() => transformText('lowercase')}
          >
            <CaseLower />
            {strings.lowercase}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onPress={() => transformText('trim-lines')}
          >
            <ListFilter />
            {strings.trimLines}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onPress={() => transformText('remove-empty-lines')}
          >
            <Trash2 />
            {strings.removeEmptyLines}
          </Button>
          <Button
            type="button"
            variant="tertiary"
            onPress={() => transformText('unique-lines')}
          >
            <Waypoints />
            {strings.uniqueLines}
          </Button>
        </div>
      </Form>

      {output && <ToolOutput content={output} />}
    </div>
  );
}

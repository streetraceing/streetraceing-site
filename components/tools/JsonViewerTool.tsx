'use client';

import { Button } from '@/components/ui/Button';
import { useLocale } from '@/app/providers';
import { formatLosslessJson } from '@/utils/lossless-json';
import {
  Description,
  FieldError,
  Form,
  Label,
  TextArea,
  TextField,
} from '@heroui/react';
import { Braces, Minimize2, Sparkles } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { ErrorAlert } from './ErrorAlert';
import { ToolOutput } from './ToolOutput';

const jsonExample =
  '{\n  "name": "streetraceing",\n  "tools": ["JSON Viewer", "UUID Generator"]\n}';

export function JsonViewerTool() {
  const { copy } = useLocale();
  const strings = copy.tools.json;
  const [source, setSource] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string>();

  function transformJson(indent: number) {
    try {
      setOutput(formatLosslessJson(source, indent));
      setError(undefined);
    } catch (caughtError) {
      setOutput('');
      setError(
        caughtError instanceof RangeError
          ? strings.limit
          : strings.invalidGeneric,
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
          onChange={(value) => {
            setSource(value);
            setOutput('');
            setError(undefined);
          }}
          validate={(value) => (value.trim() ? null : strings.required)}
        >
          <Label>{strings.label}</Label>
          <TextArea
            variant="secondary"
            rows={12}
            placeholder={strings.placeholder}
            spellCheck={false}
          />
          <Description>{strings.description}</Description>
          <FieldError />
        </TextField>

        <div className="flex flex-wrap gap-2">
          <Button type="submit">
            <Braces />
            {strings.format}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onPress={() => transformJson(0)}
          >
            <Minimize2 />
            {strings.minify}
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
            {strings.example}
          </Button>
        </div>
      </Form>

      {error ? <ErrorAlert title={strings.errorTitle} message={error} /> : null}

      {output && (
        <ToolOutput content={output} label={strings.output} format="json" />
      )}
    </div>
  );
}

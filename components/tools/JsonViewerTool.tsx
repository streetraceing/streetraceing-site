'use client';

import { Button } from '@/components/ui/Button';
import { useLocale } from '@/app/providers';
import {
  Alert,
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
import { toolFieldClassName } from './toolStyles';

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
      const parsed = JSON.parse(source);
      setOutput(JSON.stringify(parsed, null, indent));
      setError(undefined);
    } catch (caughtError) {
      setOutput('');
      setError(
        caughtError instanceof Error
          ? strings.invalid.replace('{message}', caughtError.message)
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
          onChange={setSource}
          validate={(value) => (value.trim() ? null : strings.required)}
        >
          <Label>{strings.label}</Label>
          <TextArea
            variant="secondary"
            className={toolFieldClassName}
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

      {error && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{strings.errorTitle}</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {output && <ToolOutput content={output} label={strings.output} />}
    </div>
  );
}

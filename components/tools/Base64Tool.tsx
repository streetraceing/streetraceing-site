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
import { ArrowLeftRight, LockKeyhole, UnlockKeyhole } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { ToolOutput } from './ToolOutput';
import { toolAlertClassName, toolFieldClassName } from './toolStyles';

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
  const { copy } = useLocale();
  const strings = copy.tools.base64;
  const [source, setSource] = useState('');
  const [output, setOutput] = useState('');
  const [outputFormat, setOutputFormat] = useState<'base64' | 'plain'>(
    'base64',
  );
  const [error, setError] = useState<string>();

  function transform(direction: 'encode' | 'decode') {
    try {
      setOutput(
        direction === 'encode' ? encodeBase64(source) : decodeBase64(source),
      );
      setOutputFormat(direction === 'encode' ? 'base64' : 'plain');
      setError(undefined);
    } catch {
      setOutput('');
      setError(direction === 'decode' ? strings.invalid : strings.encodeFailed);
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
          validate={(value) => (value ? null : strings.required)}
        >
          <Label>{strings.label}</Label>
          <TextArea
            variant="secondary"
            className={toolFieldClassName}
            rows={10}
            placeholder={strings.placeholder}
            spellCheck={false}
          />
          <Description>{strings.description}</Description>
          <FieldError />
        </TextField>

        <div className="flex flex-wrap gap-2">
          <Button type="submit">
            <LockKeyhole />
            {strings.encode}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onPress={() => transform('decode')}
          >
            <UnlockKeyhole />
            {strings.decode}
          </Button>
          <Button
            type="button"
            variant="tertiary"
            onPress={() => {
              setSource('Hello, world!');
              setOutput('');
              setError(undefined);
            }}
          >
            <ArrowLeftRight />
            {strings.example}
          </Button>
        </div>
      </Form>

      {error && (
        <Alert status="danger" className={toolAlertClassName}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{strings.errorTitle}</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {output && (
        <ToolOutput
          content={output}
          label={strings.output}
          format={outputFormat}
        />
      )}
    </div>
  );
}

'use client';

import { Button } from '@/components/ui/Button';
import { useLocale } from '@/app/providers';
import { decodeBase64Text, encodeBase64Text } from '@/utils/text-codec';
import {
  Description,
  FieldError,
  Form,
  Label,
  TextArea,
  TextField,
} from '@heroui/react';
import { ArrowLeftRight, LockKeyhole, UnlockKeyhole } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { ErrorAlert } from './ErrorAlert';
import { ToggleField } from './ToggleField';
import { ToolOutput } from './ToolOutput';

export function Base64Tool() {
  const { copy } = useLocale();
  const strings = copy.tools.base64;
  const [source, setSource] = useState('');
  const [urlSafe, setUrlSafe] = useState(false);
  const [output, setOutput] = useState<string>();
  const [outputFormat, setOutputFormat] = useState<'base64' | 'plain'>(
    'base64',
  );
  const [error, setError] = useState<string>();

  function transform(direction: 'encode' | 'decode') {
    try {
      setOutput(
        direction === 'encode'
          ? encodeBase64Text(source, urlSafe ? 'base64url' : 'base64')
          : decodeBase64Text(source, urlSafe ? 'base64url' : 'base64'),
      );
      setOutputFormat(direction === 'encode' ? 'base64' : 'plain');
      setError(undefined);
    } catch (error) {
      setOutput(undefined);
      setError(
        error instanceof RangeError
          ? strings.limit
          : direction === 'decode'
            ? strings.invalid
            : strings.encodeFailed,
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
          fullWidth
          name="base64"
          value={source}
          onChange={(value) => {
            setSource(value);
            setOutput(undefined);
            setError(undefined);
          }}
        >
          <Label>{strings.label}</Label>
          <TextArea
            variant="secondary"
            rows={10}
            placeholder={strings.placeholder}
            spellCheck={false}
          />
          <Description>{strings.description}</Description>
          <FieldError />
        </TextField>

        <ToggleField
          checked={urlSafe}
          label={strings.urlSafe}
          onChange={(value) => {
            setUrlSafe(value);
            setOutput(undefined);
            setError(undefined);
          }}
        />

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
              setOutput(undefined);
              setError(undefined);
            }}
          >
            <ArrowLeftRight />
            {strings.example}
          </Button>
        </div>
      </Form>

      {error ? <ErrorAlert title={strings.errorTitle} message={error} /> : null}

      {output !== undefined && (
        <ToolOutput
          content={output}
          label={strings.output}
          format={outputFormat}
        />
      )}
    </div>
  );
}

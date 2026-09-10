'use client';

import { Button } from '@/components/ui/Button';
import { useLocale } from '@/app/providers';
import { Description, Form, Label, TextArea, TextField } from '@heroui/react';
import { ArrowLeftRight, LockKeyhole, UnlockKeyhole } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { ErrorAlert } from './ErrorAlert';
import { ToolOutput } from './ToolOutput';

const urlExample = 'https://example.com/search?q=привет мир&page=2';

export function UrlCodecTool() {
  const { copy } = useLocale();
  const strings = copy.tools.urlCodec;
  const [source, setSource] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string>();

  function encodeValue() {
    setOutput(encodeURIComponent(source));
    setError(undefined);
  }

  function decodeValue() {
    try {
      setOutput(decodeURIComponent(source));
      setError(undefined);
    } catch {
      setOutput('');
      setError(strings.invalidDecode);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    encodeValue();
  }

  return (
    <div className="flex flex-col gap-4">
      <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TextField
          fullWidth
          name="url-codec"
          value={source}
          onChange={setSource}
        >
          <Label>{strings.label}</Label>
          <TextArea
            variant="secondary"
            rows={6}
            placeholder={strings.placeholder}
            spellCheck={false}
          />
          <Description>{strings.description}</Description>
        </TextField>

        <div className="flex flex-wrap gap-2">
          <Button type="submit">
            <LockKeyhole />
            {strings.encode}
          </Button>
          <Button type="button" variant="secondary" onPress={decodeValue}>
            <UnlockKeyhole />
            {strings.decode}
          </Button>
          <Button
            type="button"
            variant="tertiary"
            onPress={() => {
              setSource(urlExample);
              setOutput('');
              setError(undefined);
            }}
          >
            <ArrowLeftRight />
            {strings.example}
          </Button>
        </div>
      </Form>

      {error ? <ErrorAlert title={strings.errorTitle} message={error} /> : null}

      {output && (
        <ToolOutput content={output} label={strings.output} format="url" />
      )}
    </div>
  );
}

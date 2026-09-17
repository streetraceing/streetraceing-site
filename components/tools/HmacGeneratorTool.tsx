'use client';

import { Button, ButtonRipple } from '@/components/ui/Button';
import { useLocale } from '@/app/providers';
import { bytesToHex } from '@/utils/toolkit';
import {
  Description,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  TextArea,
  TextField,
} from '@heroui/react';
import { KeySquare } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';

import { ErrorAlert } from './ErrorAlert';
import { ToolOutput } from './ToolOutput';

const hmacAlgorithms = ['SHA-256', 'SHA-384', 'SHA-512'] as const;
type HmacAlgorithm = (typeof hmacAlgorithms)[number];

export function HmacGeneratorTool() {
  const { copy } = useLocale();
  const strings = copy.tools.hmac;
  const [message, setMessage] = useState('');
  const [secret, setSecret] = useState('');
  const [algorithm, setAlgorithm] = useState<HmacAlgorithm>('SHA-256');
  const [result, setResult] = useState<{
    digest: string;
    algorithm: HmacAlgorithm;
    messageBytes: number;
  }>();
  const revision = useRef(0);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(
    () => () => {
      revision.current += 1;
    },
    [],
  );

  function invalidate() {
    revision.current += 1;
    setResult(undefined);
    setError(undefined);
    setIsPending(false);
  }

  async function sign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    invalidate();
    const current = revision.current;
    const selectedAlgorithm = algorithm;
    if (!secret) {
      setError(strings.required);
      return;
    }
    setIsPending(true);

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: selectedAlgorithm },
        false,
        ['sign'],
      );
      if (revision.current !== current) return;
      const signature = await crypto.subtle.sign('HMAC', key, data);
      if (revision.current === current) {
        setResult({
          digest: bytesToHex(signature),
          algorithm: selectedAlgorithm,
          messageBytes: data.byteLength,
        });
      }
    } catch {
      if (revision.current === current) setError(strings.failed);
    } finally {
      if (revision.current === current) setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Form
        className="flex flex-col gap-4"
        onSubmit={(event) => void sign(event)}
      >
        <Select
          value={algorithm}
          variant="secondary"
          onChange={(value) => {
            if (hmacAlgorithms.includes(value as HmacAlgorithm)) {
              invalidate();
              setAlgorithm(value as HmacAlgorithm);
            }
          }}
        >
          <Label>{strings.algorithm}</Label>
          <Select.Trigger>
            <ButtonRipple />
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {hmacAlgorithms.map((value) => (
                <ListBox.Item key={value} id={value} textValue={value}>
                  {value}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <TextField
          fullWidth
          name="hmac-message"
          value={message}
          onChange={(value) => {
            invalidate();
            setMessage(value);
          }}
        >
          <Label>{strings.messageLabel}</Label>
          <TextArea rows={5} variant="secondary" spellCheck={false} />
        </TextField>

        <TextField
          fullWidth
          name="hmac-secret"
          value={secret}
          onChange={(value) => {
            invalidate();
            setSecret(value);
          }}
        >
          <Label>{strings.secretLabel}</Label>
          <Input
            type="text"
            variant="secondary"
            spellCheck={false}
            autoComplete="off"
          />
          <Description>{strings.required}</Description>
        </TextField>

        <Button type="submit" isPending={isPending} className="self-start">
          <KeySquare />
          {strings.sign}
        </Button>
      </Form>

      {error ? <ErrorAlert title={strings.errorTitle} message={error} /> : null}

      {result ? (
        <ToolOutput
          content={result.digest}
          label={`${result.algorithm} ${strings.output}, ${strings.messageBytes.replace('{count}', String(result.messageBytes))}`}
          format="hash"
        />
      ) : null}
    </div>
  );
}

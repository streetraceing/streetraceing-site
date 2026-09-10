'use client';

import { Button } from '@/components/ui/Button';
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
import { type FormEvent, useState } from 'react';

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
  const [output, setOutput] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string>();

  async function sign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!message || !secret) {
      setError(strings.required);
      return;
    }

    setIsPending(true);
    setError(undefined);

    try {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: algorithm },
        false,
        ['sign'],
      );
      const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(message),
      );
      setOutput(bytesToHex(signature));
    } catch {
      setOutput('');
      setError(strings.failed);
    } finally {
      setIsPending(false);
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
              setAlgorithm(value as HmacAlgorithm);
            }
          }}
        >
          <Label>{strings.algorithm}</Label>
          <Select.Trigger>
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
          onChange={setMessage}
        >
          <Label>{strings.messageLabel}</Label>
          <TextArea rows={5} variant="secondary" spellCheck={false} />
        </TextField>

        <TextField
          fullWidth
          name="hmac-secret"
          value={secret}
          onChange={setSecret}
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

      {output ? (
        <ToolOutput content={output} label={strings.output} format="hash" />
      ) : null}
    </div>
  );
}

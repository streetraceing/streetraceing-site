'use client';

import { useLocale } from '@/app/providers';
import { convertNumberBase } from '@/utils/toolkit';
import {
  Description,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  TextField,
} from '@heroui/react';
import { Binary } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ErrorAlert } from './ErrorAlert';
import { ToolOutput } from './ToolOutput';

const inputBases = [2, 8, 10, 16] as const;
type InputBase = (typeof inputBases)[number];

const inputBaseLabels: Record<InputBase, string> = {
  2: 'BIN',
  8: 'OCT',
  10: 'DEC',
  16: 'HEX',
};

export function BaseConverterTool() {
  const { copy } = useLocale();
  const strings = copy.tools.baseConverter;
  const [source, setSource] = useState('255');
  const [base, setBase] = useState<InputBase>(10);
  const result = useMemo(() => convertNumberBase(source, base), [base, source]);

  const output = result
    ? [
        `${strings.binary}: ${result.binary}`,
        `${strings.octal}: ${result.octal}`,
        `${strings.decimal}: ${result.decimal}`,
        `${strings.hexadecimal}: ${result.hexadecimal}`,
      ].join('\n')
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      <Form
        className="flex flex-col gap-4"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <TextField
            fullWidth
            name="base-number"
            value={source}
            onChange={setSource}
          >
            <Label>{strings.label}</Label>
            <Input
              variant="secondary"
              spellCheck={false}
              placeholder={strings.placeholder}
            />
            <Description>{strings.description}</Description>
          </TextField>

          <Select
            value={String(base)}
            variant="secondary"
            onChange={(value) => {
              const parsed = Number(value);

              if (inputBases.includes(parsed as InputBase)) {
                setBase(parsed as InputBase);
              }
            }}
          >
            <Label>{strings.inputBase}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {inputBases.map((value) => (
                  <ListBox.Item
                    key={value}
                    id={String(value)}
                    textValue={inputBaseLabels[value]}
                  >
                    {inputBaseLabels[value]}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      </Form>

      {source.trim() && !result ? (
        <ErrorAlert title={strings.errorTitle} message={strings.invalid} />
      ) : null}

      {result && output ? (
        <ToolOutput
          content={output}
          label={strings.output}
          format="key-value"
        />
      ) : null}
    </div>
  );
}

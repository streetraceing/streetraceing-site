'use client';

import { useLocale } from '@/app/providers';
import { Button } from '@/components/ui/Button';
import {
  CsvError,
  csvToJson,
  jsonToCsv,
  type CsvErrorCode,
  type Delimiter,
} from '@/utils/csv';
import { JsonPointerError, resolveJsonPointer } from '@/utils/json-pointer';
import { inspectUnicode, type UnicodeInspection } from '@/utils/unicode';
import {
  Card,
  Description,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  TextArea,
  TextField,
  Typography,
} from '@heroui/react';
import { ArrowLeftRight, Search, Table2 } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';

import { ErrorAlert } from './ErrorAlert';
import { ToggleField } from './ToggleField';
import { ToolOutput } from './ToolOutput';

const delimiters: Delimiter[] = [',', '\t', ';'];
const csvExample =
  'name,role,active\nAndrey,developer,true\nЛиза,designer,false';

type CsvStrings = {
  errors: Record<CsvErrorCode, string>;
  lineSuffix: string;
};

function describeCsvError(error: unknown, strings: CsvStrings) {
  if (error instanceof CsvError) {
    const message = strings.errors[error.code];

    return error.line === undefined
      ? message
      : `${message} ${strings.lineSuffix.replace('{line}', String(error.line))}`;
  }

  return strings.errors['invalid-json'];
}

export function CsvConverterTool() {
  const { copy } = useLocale();
  const strings = copy.tools.csv;
  const [source, setSource] = useState(csvExample);
  const [delimiter, setDelimiter] = useState<Delimiter>(',');
  const [protectFormulas, setProtectFormulas] = useState(true);
  const [output, setOutput] = useState<string>();
  const [error, setError] = useState<string>();

  function reset() {
    setOutput(undefined);
    setError(undefined);
  }

  function run(direction: 'to-json' | 'to-csv') {
    try {
      setOutput(
        direction === 'to-json'
          ? csvToJson(source, delimiter)
          : jsonToCsv(source, delimiter, protectFormulas),
      );
      setError(undefined);
    } catch (caughtError) {
      setOutput(undefined);
      setError(describeCsvError(caughtError, strings));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          run('to-json');
        }}
      >
        <TextField
          fullWidth
          name="csv-source"
          value={source}
          onChange={(value) => {
            setSource(value);
            reset();
          }}
        >
          <Label>{strings.label}</Label>
          <TextArea rows={12} variant="secondary" spellCheck={false} />
          <Description>{strings.description}</Description>
        </TextField>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            value={delimiter}
            variant="secondary"
            onChange={(value) => {
              if (
                typeof value === 'string' &&
                delimiters.includes(value as Delimiter)
              ) {
                setDelimiter(value as Delimiter);
                reset();
              }
            }}
          >
            <Label>{strings.delimiter}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {delimiters.map((value) => (
                  <ListBox.Item
                    key={value}
                    id={value}
                    textValue={strings.delimiters[value]}
                  >
                    {strings.delimiters[value]}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <div className="flex items-end">
            <ToggleField
              checked={protectFormulas}
              label={strings.protectFormulas}
              onChange={(value) => {
                setProtectFormulas(value);
                reset();
              }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit">
            <Table2 />
            {strings.toJson}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onPress={() => run('to-csv')}
          >
            <ArrowLeftRight />
            {strings.toCsv}
          </Button>
        </div>
      </Form>

      {error ? <ErrorAlert title={strings.errorTitle} message={error} /> : null}
      {output !== undefined ? (
        <ToolOutput content={output} label={strings.output} format="json" />
      ) : null}
    </div>
  );
}

const pointerExample =
  '{"items":[{"id":1,"name":"alpha"},{"id":2,"name":"beta"}]}';

function describePointerError(
  error: unknown,
  strings: { errors: Record<string, string> },
) {
  return error instanceof JsonPointerError
    ? strings.errors[error.code]
    : strings.errors['syntax'];
}

export function JsonPointerTool() {
  const { copy } = useLocale();
  const strings = copy.tools.jsonPointer;
  const [source, setSource] = useState(pointerExample);
  const [pointer, setPointer] = useState('/items/1/name');
  const [output, setOutput] = useState<string>();
  const [error, setError] = useState<string>();

  function resolve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const parsed: unknown = JSON.parse(source);
      const resolved = resolveJsonPointer(parsed, pointer);

      setOutput(
        resolved === undefined
          ? strings.undefinedValue
          : JSON.stringify(resolved, null, 2),
      );
      setError(undefined);
    } catch (caughtError) {
      setOutput(undefined);
      setError(
        caughtError instanceof SyntaxError
          ? strings.invalidJson
          : describePointerError(caughtError, strings),
      );
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Form className="flex flex-col gap-4" onSubmit={resolve}>
        <TextField
          fullWidth
          name="json-pointer-path"
          value={pointer}
          onChange={(value) => {
            setPointer(value);
            setOutput(undefined);
            setError(undefined);
          }}
        >
          <Label>{strings.pointerLabel}</Label>
          <Input
            variant="secondary"
            spellCheck={false}
            placeholder="/items/0/name"
          />
          <Description>{strings.pointerDescription}</Description>
        </TextField>

        <TextField
          fullWidth
          name="json-pointer-source"
          value={source}
          onChange={(value) => {
            setSource(value);
            setOutput(undefined);
            setError(undefined);
          }}
        >
          <Label>{strings.label}</Label>
          <TextArea rows={10} variant="secondary" spellCheck={false} />
          <Description>{strings.description}</Description>
        </TextField>

        <Button type="submit" className="self-start">
          <Search />
          {strings.resolve}
        </Button>
      </Form>

      {error ? <ErrorAlert title={strings.errorTitle} message={error} /> : null}
      {output !== undefined ? (
        <ToolOutput content={output} label={strings.output} format="json" />
      ) : null}
    </div>
  );
}

type UnicodeStrings = {
  codePoints: string;
  utf16Units: string;
  utf8Bytes: string;
  nfc: string;
  nfd: string;
  nfkc: string;
  nfkd: string;
};

function buildUnicodeSummary(
  result: UnicodeInspection,
  strings: UnicodeStrings,
) {
  return [
    `${strings.codePoints}: ${result.codePoints}`,
    `${strings.utf16Units}: ${result.utf16Units}`,
    `${strings.utf8Bytes}: ${result.utf8Bytes}`,
    '',
    `${strings.nfc}: ${result.nfc}`,
    `${strings.nfd}: ${result.nfd}`,
    `${strings.nfkc}: ${result.nfkc}`,
    `${strings.nfkd}: ${result.nfkd}`,
  ].join('\n');
}

export function UnicodeInspectorTool() {
  const { copy } = useLocale();
  const strings = copy.tools.unicode;
  const [source, setSource] = useState('Привет, world \u200B\u00A0');

  const result = useMemo(() => {
    try {
      return { inspection: inspectUnicode(source), failed: false };
    } catch {
      return { inspection: undefined, failed: true };
    }
  }, [source]);

  const inspection = result.inspection;

  return (
    <div className="flex flex-col gap-4">
      <Form
        className="flex flex-col gap-4"
        onSubmit={(event) => event.preventDefault()}
      >
        <TextField
          fullWidth
          name="unicode-source"
          value={source}
          onChange={setSource}
        >
          <Label>{strings.label}</Label>
          <TextArea rows={8} variant="secondary" spellCheck={false} />
          <Description>{strings.description}</Description>
        </TextField>
      </Form>

      {result.failed ? (
        <ErrorAlert title={strings.errorTitle} message={strings.limit} />
      ) : null}

      {inspection ? (
        <>
          <ToolOutput
            content={buildUnicodeSummary(inspection, strings)}
            label={strings.summary}
            format="key-value"
          />

          <Card variant="secondary" className="dark:bg-default/20">
            <Card.Header>
              <Card.Title>{strings.characters}</Card.Title>
              <Card.Description>
                {strings.charactersDescription}
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <div className="max-h-96 overflow-auto rounded-lg bg-surface">
                <table className="w-full border-collapse text-left font-mono text-xs">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="text-muted">
                      <th scope="col" className="px-3 py-2 font-medium">
                        {strings.columnCharacter}
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        {strings.columnCodePoint}
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        {strings.columnUtf8}
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        {strings.columnName}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspection.rows.map((row, index) => (
                      <tr
                        key={`${index}-${row.codePoint}`}
                        className="border-t border-border/60"
                      >
                        <td className="px-3 py-1.5 whitespace-pre-wrap break-all">
                          {row.character}
                        </td>
                        <td className="px-3 py-1.5">{row.codePoint}</td>
                        <td className="px-3 py-1.5">{row.utf8}</td>
                        <td className="px-3 py-1.5 font-sans text-muted">
                          {row.name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {inspection.rows.length === 0 ? (
                <Typography.Paragraph className="text-sm text-muted">
                  {strings.empty}
                </Typography.Paragraph>
              ) : null}
            </Card.Content>
          </Card>
        </>
      ) : null}
    </div>
  );
}

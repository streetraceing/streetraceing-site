'use client';

import { useLocale } from '@/app/providers';
import { Button } from '@/components/ui/Button';
import { getLocaleTag } from '@/utils/i18n';
import { bytesToHex, decodeJwt, generateSecurePassword } from '@/utils/toolkit';
import {
  Alert,
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
import {
  FileKey2,
  Fingerprint,
  KeyRound,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import {
  type ChangeEvent,
  type FormEvent,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ToolOutput } from './ToolOutput';
import {
  toolAlertClassName,
  toolChoiceClassName,
  toolFieldClassName,
  toolPanelClassName,
  toolSelectTriggerClassName,
} from './toolStyles';

type HashAlgorithm = 'SHA-256' | 'SHA-384' | 'SHA-512';

type ToggleFieldProps = {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
};

function ToggleField({ checked, label, onChange }: ToggleFieldProps) {
  return (
    <label className={toolChoiceClassName}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
        className="size-4 accent-accent"
      />
      <span>{label}</span>
    </label>
  );
}

function ErrorAlert({ title, message }: { title: string; message: string }) {
  return (
    <Alert status="danger" className={toolAlertClassName}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

export function PasswordGeneratorTool() {
  const { copy } = useLocale();
  const strings = copy.tools.password;
  const [length, setLength] = useState('20');
  const [lowercase, setLowercase] = useState(true);
  const [uppercase, setUppercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(true);
  const [result, setResult] = useState<{
    password: string;
    entropyBits: number;
    poolSize: number;
  }>();
  const [error, setError] = useState<string>();

  function generate() {
    const parsedLength = Number.parseInt(length, 10);

    if (
      !Number.isInteger(parsedLength) ||
      parsedLength < 8 ||
      parsedLength > 128
    ) {
      setError(strings.invalidLength);
      return;
    }

    try {
      setResult(
        generateSecurePassword({
          length: parsedLength,
          lowercase,
          uppercase,
          numbers,
          symbols,
          excludeAmbiguous,
        }),
      );
      setError(undefined);
    } catch {
      setResult(undefined);
      setError(strings.selectCharacters);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          generate();
        }}
      >
        <TextField fullWidth name="length" value={length} onChange={setLength}>
          <Label>{strings.length}</Label>
          <Input
            type="number"
            inputMode="numeric"
            min={8}
            max={128}
            variant="secondary"
            className={toolFieldClassName}
          />
          <Description>{strings.lengthHint}</Description>
        </TextField>

        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-medium">
            {strings.characters}
          </legend>
          <ToggleField
            checked={lowercase}
            label={strings.lowercase}
            onChange={setLowercase}
          />
          <ToggleField
            checked={uppercase}
            label={strings.uppercase}
            onChange={setUppercase}
          />
          <ToggleField
            checked={numbers}
            label={strings.numbers}
            onChange={setNumbers}
          />
          <ToggleField
            checked={symbols}
            label={strings.symbols}
            onChange={setSymbols}
          />
          <div className="sm:col-span-2">
            <ToggleField
              checked={excludeAmbiguous}
              label={strings.excludeAmbiguous}
              onChange={setExcludeAmbiguous}
            />
          </div>
        </fieldset>

        <Button type="submit" className="self-start">
          <KeyRound />
          {strings.generate}
        </Button>
      </Form>

      {error ? <ErrorAlert title={strings.errorTitle} message={error} /> : null}

      {result ? (
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Card variant="secondary" className={toolPanelClassName}>
              <Card.Content>
                <Typography.Paragraph size="sm" className="text-muted">
                  {strings.entropy}
                </Typography.Paragraph>
                <Typography.Heading
                  level={3}
                  className="text-xl text-sky-700 dark:text-sky-300"
                >
                  {strings.bits.replace('{count}', String(result.entropyBits))}
                </Typography.Heading>
              </Card.Content>
            </Card>
            <Card variant="secondary" className={toolPanelClassName}>
              <Card.Content>
                <Typography.Paragraph size="sm" className="text-muted">
                  {strings.pool}
                </Typography.Paragraph>
                <Typography.Heading
                  level={3}
                  className="text-xl text-violet-700 dark:text-violet-300"
                >
                  {result.poolSize}
                </Typography.Heading>
              </Card.Content>
            </Card>
          </div>
          <ToolOutput
            content={result.password}
            label={strings.output}
            format="secret"
          />
          <Button
            type="button"
            size="sm"
            variant="tertiary"
            className="self-start"
            onPress={generate}
          >
            <RefreshCw />
            {strings.generateAgain}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function getNumericClaim(payload: unknown, key: string) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return undefined;
  }

  const value = (payload as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

export function JwtInspectorTool() {
  const { copy, locale } = useLocale();
  const strings = copy.tools.jwt;
  const [source, setSource] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string>();

  function inspect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const decoded = decodeJwt(source);
      const issuedAt = getNumericClaim(decoded.payload, 'iat');
      const expiresAt = getNumericClaim(decoded.payload, 'exp');
      const now = Date.now() / 1000;
      const localeTag = getLocaleTag(locale);
      const metadata = [
        issuedAt !== undefined
          ? `${strings.issuedAt}: ${new Date(issuedAt * 1000).toLocaleString(localeTag)}`
          : undefined,
        expiresAt !== undefined
          ? `${strings.expiresAt}: ${new Date(expiresAt * 1000).toLocaleString(localeTag)}`
          : undefined,
        expiresAt !== undefined
          ? `${strings.status}: ${expiresAt > now ? strings.active : strings.expired}`
          : undefined,
      ].filter((value): value is string => value !== undefined);

      setOutput(
        [
          strings.header,
          JSON.stringify(decoded.header, null, 2),
          '',
          strings.payload,
          JSON.stringify(decoded.payload, null, 2),
          ...(metadata.length ? ['', strings.claims, ...metadata] : []),
        ].join('\n'),
      );
      setError(undefined);
    } catch {
      setOutput('');
      setError(strings.invalid);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Alert status="warning" className={toolAlertClassName}>
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{strings.warningTitle}</Alert.Title>
          <Alert.Description>{strings.warning}</Alert.Description>
        </Alert.Content>
      </Alert>

      <Form className="flex flex-col gap-4" onSubmit={inspect}>
        <TextField fullWidth name="jwt" value={source} onChange={setSource}>
          <Label>{strings.label}</Label>
          <TextArea
            rows={8}
            variant="secondary"
            className={toolFieldClassName}
            spellCheck={false}
            placeholder={strings.placeholder}
          />
          <Description>{strings.description}</Description>
        </TextField>
        <Button type="submit" className="self-start">
          <ShieldCheck />
          {strings.inspect}
        </Button>
      </Form>

      {error ? <ErrorAlert title={strings.errorTitle} message={error} /> : null}
      {output ? (
        <ToolOutput content={output} label={strings.output} format="jwt" />
      ) : null}
    </div>
  );
}

export function HashGeneratorTool() {
  const { copy } = useLocale();
  const strings = copy.tools.hash;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>('SHA-256');
  const [source, setSource] = useState('');
  const [file, setFile] = useState<File>();
  const [output, setOutput] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string>();
  const sourceDescription = useMemo(
    () =>
      file
        ? strings.fileSelected.replace('{name}', file.name)
        : strings.description,
    [file, strings.description, strings.fileSelected],
  );

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.currentTarget.files?.[0]);
    setOutput('');
    setError(undefined);
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file && !source) {
      setError(strings.required);
      return;
    }

    setIsPending(true);
    setError(undefined);

    try {
      const data = file
        ? await file.arrayBuffer()
        : new TextEncoder().encode(source);
      const digest = await crypto.subtle.digest(algorithm, data);
      setOutput(bytesToHex(digest));
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
        onSubmit={(event) => void generate(event)}
      >
        <Select
          value={algorithm}
          onChange={(value) => {
            if (
              value === 'SHA-256' ||
              value === 'SHA-384' ||
              value === 'SHA-512'
            ) {
              setAlgorithm(value);
            }
          }}
        >
          <Label>{strings.algorithm}</Label>
          <Select.Trigger className={toolSelectTriggerClassName}>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {(['SHA-256', 'SHA-384', 'SHA-512'] as const).map((value) => (
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
          name="hash-source"
          value={source}
          onChange={setSource}
        >
          <Label>{strings.textLabel}</Label>
          <TextArea
            rows={7}
            variant="secondary"
            className={toolFieldClassName}
            spellCheck={false}
            placeholder={strings.placeholder}
          />
          <Description>{sourceDescription}</Description>
        </TextField>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            onChange={selectFile}
          />
          <Button
            type="button"
            variant="secondary"
            onPress={() => fileInputRef.current?.click()}
          >
            <FileKey2 />
            {strings.chooseFile}
          </Button>
          {file ? (
            <Button
              type="button"
              variant="tertiary"
              onPress={() => {
                setFile(undefined);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              {strings.useText}
            </Button>
          ) : null}
          <Button type="submit" isPending={isPending}>
            <Fingerprint />
            {strings.generate}
          </Button>
        </div>
      </Form>

      {error ? <ErrorAlert title={strings.errorTitle} message={error} /> : null}
      {output ? (
        <ToolOutput
          content={output}
          label={`${algorithm} ${strings.output}`}
          format="hash"
        />
      ) : null}
    </div>
  );
}

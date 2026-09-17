'use client';

import { useLocale } from '@/app/providers';
import { Button, ButtonRipple } from '@/components/ui/Button';
import { getLocaleTag } from '@/utils/i18n';
import {
  bytesToHex,
  decodeJwt,
  generateSecurePassword,
  parsePasswordLength,
} from '@/utils/toolkit';
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
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ErrorAlert } from './ErrorAlert';
import { ToggleField } from './ToggleField';
import { ToolOutput } from './ToolOutput';

type HashAlgorithm = 'SHA-256' | 'SHA-384' | 'SHA-512';

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

  function resetResult() {
    setResult(undefined);
    setError(undefined);
  }

  function generate() {
    const parsedLength = parsePasswordLength(length);

    if (parsedLength === undefined) {
      setResult(undefined);
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
        <TextField
          fullWidth
          name="length"
          value={length}
          onChange={(value) => {
            setLength(value);
            resetResult();
          }}
        >
          <Label>{strings.length}</Label>
          <Input
            type="number"
            inputMode="numeric"
            min={8}
            max={128}
            variant="secondary"
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
            onChange={(value) => {
              setLowercase(value);
              resetResult();
            }}
          />
          <ToggleField
            checked={uppercase}
            label={strings.uppercase}
            onChange={(value) => {
              setUppercase(value);
              resetResult();
            }}
          />
          <ToggleField
            checked={numbers}
            label={strings.numbers}
            onChange={(value) => {
              setNumbers(value);
              resetResult();
            }}
          />
          <ToggleField
            checked={symbols}
            label={strings.symbols}
            onChange={(value) => {
              setSymbols(value);
              resetResult();
            }}
          />
          <div className="sm:col-span-2">
            <ToggleField
              checked={excludeAmbiguous}
              label={strings.excludeAmbiguous}
              onChange={(value) => {
                setExcludeAmbiguous(value);
                resetResult();
              }}
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
            <Card variant="secondary" className="dark:bg-default/20">
              <Card.Content>
                <Typography.Paragraph size="sm" className="text-muted">
                  {strings.entropy}
                </Typography.Paragraph>
                <Typography.Heading level={3} className="text-xl">
                  {strings.bits.replace('{count}', String(result.entropyBits))}
                </Typography.Heading>
              </Card.Content>
            </Card>
            <Card variant="secondary" className="dark:bg-default/20">
              <Card.Content>
                <Typography.Paragraph size="sm" className="text-muted">
                  {strings.pool}
                </Typography.Paragraph>
                <Typography.Heading level={3} className="text-xl">
                  {result.poolSize}
                </Typography.Heading>
              </Card.Content>
            </Card>
          </div>
          <Typography.Paragraph size="sm" className="text-muted">
            {strings.entropyHint}
          </Typography.Paragraph>
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
      <Alert status="warning">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{strings.warningTitle}</Alert.Title>
          <Alert.Description>{strings.warning}</Alert.Description>
        </Alert.Content>
      </Alert>

      <Form className="flex flex-col gap-4" onSubmit={inspect}>
        <TextField
          fullWidth
          name="jwt"
          value={source}
          onChange={(value) => {
            setSource(value);
            setOutput('');
            setError(undefined);
          }}
        >
          <Label>{strings.label}</Label>
          <TextArea
            rows={8}
            variant="secondary"
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
  const [result, setResult] = useState<{
    digest: string;
    algorithm: HashAlgorithm;
    fileName?: string;
    bytes: number;
  }>();
  const revision = useRef(0);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string>();
  const sourceDescription = useMemo(
    () =>
      file
        ? strings.fileSelected.replace('{name}', file.name)
        : strings.description,
    [file, strings.description, strings.fileSelected],
  );

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

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    invalidate();
    const selected = event.currentTarget.files?.[0];
    setFile(selected);
    if (selected && selected.size > 20 * 1024 * 1024)
      setError(strings.fileTooLarge);
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    invalidate();
    const current = revision.current;
    const selectedAlgorithm = algorithm;
    const selectedFile = file;
    if (selectedFile && selectedFile.size > 20 * 1024 * 1024) {
      setError(strings.fileTooLarge);
      return;
    }
    setIsPending(true);

    try {
      const data = selectedFile
        ? await selectedFile.arrayBuffer()
        : new TextEncoder().encode(source);
      if (revision.current !== current) return;
      const digest = await crypto.subtle.digest(selectedAlgorithm, data);
      if (revision.current === current) {
        setResult({
          digest: bytesToHex(digest),
          algorithm: selectedAlgorithm,
          fileName: selectedFile?.name,
          bytes: data.byteLength,
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
        onSubmit={(event) => void generate(event)}
      >
        <Select
          value={algorithm}
          variant="secondary"
          onChange={(value) => {
            if (
              value === 'SHA-256' ||
              value === 'SHA-384' ||
              value === 'SHA-512'
            ) {
              invalidate();
              setAlgorithm(value);
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
          onChange={(value) => {
            invalidate();
            setSource(value);
          }}
        >
          <Label>{strings.textLabel}</Label>
          <TextArea
            rows={7}
            variant="secondary"
            spellCheck={false}
            placeholder={strings.placeholder}
          />
          <Description>{sourceDescription}</Description>
        </TextField>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            aria-label={strings.chooseFile}
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
                invalidate();
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
      {result ? (
        <ToolOutput
          content={result.digest}
          label={`${result.algorithm} ${strings.output}, ${result.fileName !== undefined ? strings.fileSelected.replace('{name}', result.fileName) : strings.textLabel} (${strings.bytes.replace('{count}', String(result.bytes))})`}
          format="hash"
        />
      ) : null}
    </div>
  );
}

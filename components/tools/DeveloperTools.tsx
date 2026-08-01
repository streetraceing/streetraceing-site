'use client';

import { useLocale } from '@/app/providers';
import { Button } from '@/components/ui/Button';
import {
  createLineDiff,
  jsonToTypeScript,
  removeTrackingParameters,
} from '@/utils/toolkit';
import {
  Alert,
  Description,
  Form,
  Input,
  Label,
  TextArea,
  TextField,
  Typography,
} from '@heroui/react';
import {
  Braces,
  GitCompareArrows,
  Link2,
  ListFilter,
  Regex,
  Sparkles,
} from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { ToolOutput } from './ToolOutput';

function ErrorAlert({ title, message }: { title: string; message: string }) {
  return (
    <Alert status="danger">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

export function RegexTesterTool() {
  const { copy } = useLocale();
  const strings = copy.tools.regex;
  const [pattern, setPattern] = useState('(?:https?://)?([^/\\s]+)');
  const [flags, setFlags] = useState('gi');
  const [source, setSource] = useState(
    'Open https://streetraceing.github.io and github.com/streetraceing.',
  );
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string>();

  function testRegex(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const normalizedFlags = [...new Set(flags.trim())].join('');

      if (!/^[dgimsuvy]*$/.test(normalizedFlags)) {
        throw new Error(strings.invalidFlags);
      }

      const expression = new RegExp(
        pattern,
        normalizedFlags.includes('g') ? normalizedFlags : `${normalizedFlags}g`,
      );
      const matches: string[] = [];
      let match: RegExpExecArray | null;

      while (
        (match = expression.exec(source)) !== null &&
        matches.length < 200
      ) {
        const groups = match
          .slice(1)
          .map((value, index) =>
            value === undefined ? undefined : `  $${index + 1}: ${value}`,
          )
          .filter(Boolean);
        const namedGroups = Object.entries(match.groups ?? {}).map(
          ([name, value]) => `  ${name}: ${value ?? ''}`,
        );

        matches.push(
          [
            `#${matches.length + 1} [${match.index}..${match.index + match[0].length}] ${match[0]}`,
            ...groups,
            ...namedGroups,
          ].join('\n'),
        );

        if (match[0] === '') {
          expression.lastIndex += 1;
        }
      }

      setOutput(matches.length > 0 ? matches.join('\n\n') : strings.noMatches);
      setError(undefined);
    } catch (caughtError) {
      setOutput('');
      setError(
        caughtError instanceof Error ? caughtError.message : strings.invalid,
      );
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Form className="flex flex-col gap-4" onSubmit={testRegex}>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
          <TextField
            fullWidth
            name="pattern"
            value={pattern}
            onChange={setPattern}
          >
            <Label>{strings.pattern}</Label>
            <Input variant="secondary" spellCheck={false} />
          </TextField>
          <TextField fullWidth name="flags" value={flags} onChange={setFlags}>
            <Label>{strings.flags}</Label>
            <Input variant="secondary" spellCheck={false} />
          </TextField>
        </div>

        <TextField
          fullWidth
          name="regex-source"
          value={source}
          onChange={setSource}
        >
          <Label>{strings.text}</Label>
          <TextArea rows={10} variant="secondary" spellCheck={false} />
          <Description>{strings.description}</Description>
        </TextField>

        <Button type="submit" className="self-start">
          <Regex />
          {strings.test}
        </Button>
      </Form>

      {error ? <ErrorAlert title={strings.errorTitle} message={error} /> : null}
      {output ? (
        <ToolOutput content={output} label={strings.output} format="regex" />
      ) : null}
    </div>
  );
}

type UrlLabels = {
  protocol: string;
  origin: string;
  host: string;
  port: string;
  path: string;
  hash: string;
  query: string;
};

function formatUrlDetails(value: string, labels: UrlLabels) {
  const url = new URL(value);
  const query = [...url.searchParams.entries()]
    .map(([key, parameterValue]) => `${key} = ${parameterValue}`)
    .join('\n');

  return [
    `${labels.protocol}: ${url.protocol}`,
    `${labels.origin}: ${url.origin}`,
    `${labels.host}: ${url.hostname}`,
    `${labels.port}: ${url.port || '—'}`,
    `${labels.path}: ${url.pathname}`,
    `${labels.hash}: ${url.hash || '—'}`,
    '',
    `${labels.query}:`,
    query || '—',
  ].join('\n');
}

export function UrlInspectorTool() {
  const { copy } = useLocale();
  const strings = copy.tools.url;
  const [source, setSource] = useState(
    'https://example.com/docs?page=2&utm_source=test#install',
  );
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string>();

  function inspect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setOutput(formatUrlDetails(source, strings));
      setError(undefined);
    } catch {
      setOutput('');
      setError(strings.invalid);
    }
  }

  function cleanTracking() {
    try {
      const result = removeTrackingParameters(source);
      setSource(result.url);
      setOutput(
        [
          result.url,
          '',
          result.removed.length
            ? strings.removed.replace('{items}', result.removed.join(', '))
            : strings.nothingRemoved,
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
      <Form className="flex flex-col gap-4" onSubmit={inspect}>
        <TextField fullWidth name="url" value={source} onChange={setSource}>
          <Label>{strings.label}</Label>
          <Input type="url" variant="secondary" spellCheck={false} />
          <Description>{strings.description}</Description>
        </TextField>
        <div className="flex flex-wrap gap-2">
          <Button type="submit">
            <Link2 />
            {strings.inspect}
          </Button>
          <Button type="button" variant="secondary" onPress={cleanTracking}>
            <ListFilter />
            {strings.clean}
          </Button>
        </div>
      </Form>

      {error ? <ErrorAlert title={strings.errorTitle} message={error} /> : null}
      {output ? (
        <ToolOutput content={output} label={strings.output} format="url" />
      ) : null}
    </div>
  );
}

const jsonExample = `{
  "id": 42,
  "profile": {
    "name": "streetraceing",
    "active": true
  },
  "tags": ["typescript", "nextjs"]
}`;

export function JsonToTypeScriptTool() {
  const { copy } = useLocale();
  const strings = copy.tools.jsonType;
  const [rootName, setRootName] = useState('Root');
  const [source, setSource] = useState(jsonExample);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string>();

  function convert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setOutput(jsonToTypeScript(JSON.parse(source), rootName || 'Root'));
      setError(undefined);
    } catch (caughtError) {
      setOutput('');
      setError(
        caughtError instanceof Error ? caughtError.message : strings.invalid,
      );
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Form className="flex flex-col gap-4" onSubmit={convert}>
        <TextField
          fullWidth
          name="root-name"
          value={rootName}
          onChange={setRootName}
        >
          <Label>{strings.rootName}</Label>
          <Input variant="secondary" spellCheck={false} />
        </TextField>
        <TextField
          fullWidth
          name="json-type-source"
          value={source}
          onChange={setSource}
        >
          <Label>{strings.label}</Label>
          <TextArea rows={12} variant="secondary" spellCheck={false} />
          <Description>{strings.description}</Description>
        </TextField>
        <div className="flex flex-wrap gap-2">
          <Button type="submit">
            <Braces />
            {strings.convert}
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

      {error ? <ErrorAlert title={strings.errorTitle} message={error} /> : null}
      {output ? (
        <ToolOutput
          content={output}
          label={strings.output}
          format="typescript"
        />
      ) : null}
    </div>
  );
}

export function TextDiffTool() {
  const { copy } = useLocale();
  const strings = copy.tools.diff;
  const [beforeValue, setBeforeValue] = useState(
    'const version = 1;\nconsole.log(version);',
  );
  const [afterValue, setAfterValue] = useState(
    'const version = 2;\nconsole.info(version);',
  );
  const [output, setOutput] = useState('');

  function compare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lines = createLineDiff(beforeValue, afterValue);
    const rendered = lines
      .map((line) => {
        const prefix =
          line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';
        return `${prefix} ${line.value}`;
      })
      .join('\n');
    const added = lines.filter((line) => line.type === 'added').length;
    const removed = lines.filter((line) => line.type === 'removed').length;

    setOutput(
      [
        strings.summary
          .replace('{added}', String(added))
          .replace('{removed}', String(removed)),
        '',
        rendered,
      ].join('\n'),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Form className="flex flex-col gap-4" onSubmit={compare}>
        <div className="grid gap-4 lg:grid-cols-2">
          <TextField
            fullWidth
            name="before"
            value={beforeValue}
            onChange={setBeforeValue}
          >
            <Label>{strings.before}</Label>
            <TextArea rows={14} variant="secondary" spellCheck={false} />
          </TextField>
          <TextField
            fullWidth
            name="after"
            value={afterValue}
            onChange={setAfterValue}
          >
            <Label>{strings.after}</Label>
            <TextArea rows={14} variant="secondary" spellCheck={false} />
          </TextField>
        </div>
        <Typography.Paragraph size="sm" className="text-muted">
          {strings.description}
        </Typography.Paragraph>
        <Button type="submit" className="self-start">
          <GitCompareArrows />
          {strings.compare}
        </Button>
      </Form>

      {output ? (
        <ToolOutput content={output} label={strings.output} format="diff" />
      ) : null}
    </div>
  );
}

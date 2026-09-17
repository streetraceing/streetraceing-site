'use client';

import { useLocale } from '@/app/providers';
import { Button } from '@/components/ui/Button';
import { formatLosslessJson } from '@/utils/lossless-json';
import {
  REGEX_LIMITS,
  validateRegexRequest,
  type RegexResult,
} from '@/utils/regex-evaluator';
import {
  createLineDiff,
  jsonToTypeScript,
  removeTrackingParameters,
} from '@/utils/toolkit';
import {
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
import { type FormEvent, useEffect, useRef, useState } from 'react';

import { ErrorAlert } from './ErrorAlert';
import { ToolOutput } from './ToolOutput';

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

  const [isPending, setIsPending] = useState(false);
  const active = useRef<{ worker: Worker; timer: number } | undefined>(
    undefined,
  );

  useEffect(
    () => () => {
      const job = active.current;
      active.current = undefined;
      if (job) {
        job.worker.terminate();
        window.clearTimeout(job.timer);
      }
    },
    [],
  );

  function cancel() {
    const job = active.current;
    active.current = undefined;
    if (job) {
      job.worker.terminate();
      window.clearTimeout(job.timer);
    }
    setIsPending(false);
    setOutput('');
    setError(undefined);
  }

  function testRegex(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    cancel();
    const request = { pattern, flags, source };
    const invalid = validateRegexRequest(request);
    if (invalid) {
      setError(strings[invalid]);
      return;
    }
    try {
      const worker = new Worker(new URL('./regex.worker.ts', import.meta.url));
      const timer = window.setTimeout(() => {
        if (active.current?.worker !== worker) return;
        cancel();
        setError(strings.timeout);
      }, REGEX_LIMITS.timeout);
      active.current = { worker, timer };
      setIsPending(true);
      worker.onmessage = (message: MessageEvent<RegexResult>) => {
        if (active.current?.worker !== worker) return;
        const result = message.data;
        cancel();
        if (!result.ok) {
          setError(strings[result.error]);
        } else {
          setOutput(result.count ? result.output : strings.noMatches);
          if (result.limited) setError(strings.outputLimit);
        }
      };
      worker.onerror = (event) => {
        event.preventDefault();
        if (active.current?.worker !== worker) return;
        cancel();
        setError(strings.workerFailed);
      };
      worker.postMessage(request);
    } catch {
      cancel();
      setError(strings.workerFailed);
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
            onChange={(value) => {
              cancel();
              setPattern(value);
            }}
          >
            <Label>{strings.pattern}</Label>
            <Input variant="secondary" spellCheck={false} />
          </TextField>
          <TextField
            fullWidth
            name="flags"
            value={flags}
            onChange={(value) => {
              cancel();
              setFlags(value);
            }}
          >
            <Label>{strings.flags}</Label>
            <Input variant="secondary" spellCheck={false} />
          </TextField>
        </div>

        <TextField
          fullWidth
          name="regex-source"
          value={source}
          onChange={(value) => {
            cancel();
            setSource(value);
          }}
        >
          <Label>{strings.text}</Label>
          <TextArea rows={10} variant="secondary" spellCheck={false} />
          <Description>{strings.description}</Description>
        </TextField>

        <div className="flex flex-wrap gap-2">
          <Button type="submit">
            <Regex />
            {strings.test}
          </Button>
          {isPending ? (
            <Button type="button" variant="secondary" onPress={cancel}>
              {strings.cancel}
            </Button>
          ) : null}
        </div>
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
    `${labels.port}: ${url.port || '-'}`,
    `${labels.path}: ${url.pathname}`,
    `${labels.hash}: ${url.hash || '-'}`,
    '',
    `${labels.query}:`,
    query || '-',
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
      formatLosslessJson(source, 0);
      setOutput(jsonToTypeScript(JSON.parse(source), rootName || 'Root'));
      setError(undefined);
    } catch (caughtError) {
      setOutput('');
      setError(
        caughtError instanceof RangeError ? strings.limit : strings.invalid,
      );
    }
  }

  function resetResult() {
    setOutput('');
    setError(undefined);
  }

  return (
    <div className="flex flex-col gap-4">
      <Form className="flex flex-col gap-4" onSubmit={convert}>
        <TextField
          fullWidth
          name="root-name"
          value={rootName}
          onChange={(value) => {
            setRootName(value);
            resetResult();
          }}
        >
          <Label>{strings.rootName}</Label>
          <Input variant="secondary" spellCheck={false} />
        </TextField>
        <TextField
          fullWidth
          name="json-type-source"
          value={source}
          onChange={(value) => {
            setSource(value);
            resetResult();
          }}
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
              resetResult();
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

  const [error, setError] = useState<string>();

  function compare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
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
      setError(undefined);
    } catch {
      setOutput('');
      setError(strings.limit);
    }
  }

  function resetResult() {
    setOutput('');
    setError(undefined);
  }

  return (
    <div className="flex flex-col gap-4">
      <Form className="flex flex-col gap-4" onSubmit={compare}>
        <div className="grid gap-4 lg:grid-cols-2">
          <TextField
            fullWidth
            name="before"
            value={beforeValue}
            onChange={(value) => {
              setBeforeValue(value);
              resetResult();
            }}
          >
            <Label>{strings.before}</Label>
            <TextArea rows={14} variant="secondary" spellCheck={false} />
          </TextField>
          <TextField
            fullWidth
            name="after"
            value={afterValue}
            onChange={(value) => {
              setAfterValue(value);
              resetResult();
            }}
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

      {error ? <ErrorAlert title={strings.errorTitle} message={error} /> : null}
      {output ? (
        <ToolOutput content={output} label={strings.output} format="diff" />
      ) : null}
    </div>
  );
}

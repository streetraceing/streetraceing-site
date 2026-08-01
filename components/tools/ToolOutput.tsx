'use client';

import { useLocale } from '@/app/providers';
import { Button } from '@/components/ui/Button';
import { Card } from '@heroui/react';
import { Check, Copy } from 'lucide-react';
import { Fragment, type ReactNode, useState } from 'react';

import { toolInsetClassName, toolPanelClassName } from './toolStyles';

export type ToolOutputFormat =
  | 'plain'
  | 'json'
  | 'typescript'
  | 'diff'
  | 'key-value'
  | 'jwt'
  | 'regex'
  | 'secret'
  | 'hash'
  | 'uuid'
  | 'base64'
  | 'cron'
  | 'url';

type ToolOutputProps = {
  content: string;
  label?: string;
  format?: ToolOutputFormat;
  tone?: 'accent' | 'success';
};

type InlineToken = {
  value: string;
  className?: string;
  href?: string;
};

const inlineTokenPattern =
  /(https?:\/\/[^\s]+|#[\da-fA-F]{3,8}\b|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:true|false|null|undefined)\b|\b-?\d+(?:\.\d+)?\b)/g;

const codeTokenPattern =
  /(\/\/.*$|\/\*.*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:interface|type|export|import|from|const|let|var|function|return|extends|keyof|typeof|readonly|string|number|boolean|unknown|never|any|true|false|null|undefined)\b|\b-?\d+(?:\.\d+)?\b|\[|\]|[{}(),;:<>|?])/g;

function classifyInlineToken(value: string): InlineToken {
  if (/^https?:\/\//.test(value)) {
    return {
      value,
      href: value,
      className:
        'text-sky-600 underline decoration-sky-500/40 underline-offset-4 hover:text-sky-500 dark:text-sky-400',
    };
  }

  if (/^#[\da-fA-F]{3,8}$/.test(value)) {
    return {
      value,
      className: 'font-semibold text-fuchsia-600 dark:text-fuchsia-400',
    };
  }

  if (/^["'`]/.test(value)) {
    return {
      value,
      className: 'text-emerald-700 dark:text-emerald-400',
    };
  }

  if (/^(?:true|false)$/.test(value)) {
    return {
      value,
      className: 'font-semibold text-violet-600 dark:text-violet-400',
    };
  }

  if (/^(?:null|undefined)$/.test(value)) {
    return { value, className: 'italic text-rose-600 dark:text-rose-400' };
  }

  if (/^-?\d/.test(value)) {
    return { value, className: 'text-amber-700 dark:text-amber-400' };
  }

  return { value };
}

function renderInline(value: string, keyPrefix: string) {
  const parts = value.split(inlineTokenPattern);

  return parts.map((part, index) => {
    if (!part) {
      return null;
    }

    const token = classifyInlineToken(part);
    const key = `${keyPrefix}-${index}`;

    if (token.href) {
      return (
        <a
          key={key}
          href={token.href}
          target="_blank"
          rel="noreferrer"
          className={token.className}
        >
          {token.value}
        </a>
      );
    }

    return (
      <span key={key} className={token.className}>
        {token.value}
      </span>
    );
  });
}

function renderCodeLine(line: string, keyPrefix: string) {
  const parts = line.split(codeTokenPattern);

  return parts.map((part, index) => {
    if (!part) {
      return null;
    }

    const key = `${keyPrefix}-${index}`;
    let className: string | undefined;

    if (/^\/\//.test(part) || /^\/\*/.test(part)) {
      className = 'italic text-muted';
    } else if (/^["'`]/.test(part)) {
      className = 'text-emerald-700 dark:text-emerald-400';
    } else if (
      /^(?:interface|type|export|import|from|const|let|var|function|return|extends|keyof|typeof|readonly|string|number|boolean|unknown|never|any)$/.test(
        part,
      )
    ) {
      className = 'font-semibold text-violet-700 dark:text-violet-400';
    } else if (/^(?:true|false|null|undefined)$/.test(part)) {
      className = 'font-semibold text-rose-600 dark:text-rose-400';
    } else if (/^-?\d/.test(part)) {
      className = 'text-amber-700 dark:text-amber-400';
    } else if (part.length === 1 && '{}[](),;:<>|?'.includes(part)) {
      className = 'text-sky-700 dark:text-sky-400';
    }

    return (
      <span key={key} className={className}>
        {part}
      </span>
    );
  });
}

function renderJsonLine(line: string, keyPrefix: string): ReactNode {
  const match = line.match(/^(\s*)("(?:\\.|[^"\\])*")(\s*:)(.*)$/);

  if (!match) {
    return renderCodeLine(line, keyPrefix);
  }

  const [, indentation, key, separator, remainder] = match;

  return (
    <>
      {indentation}
      <span className="font-medium text-sky-700 dark:text-sky-400">{key}</span>
      <span className="text-muted">{separator}</span>
      {renderCodeLine(remainder, `${keyPrefix}-value`)}
    </>
  );
}

function renderKeyValueLine(line: string, keyPrefix: string): ReactNode {
  const separatorIndex = line.indexOf(': ');

  if (separatorIndex > 0 && !/^https?:\/\//.test(line)) {
    const key = line.slice(0, separatorIndex);
    const value = line.slice(separatorIndex + 2);

    return (
      <>
        <span className="font-medium text-sky-700 dark:text-sky-400">
          {key}
        </span>
        <span className="text-muted">: </span>
        <span>{renderInline(value, `${keyPrefix}-value`)}</span>
      </>
    );
  }

  if (line.endsWith(':')) {
    return (
      <span className="font-semibold text-violet-700 dark:text-violet-400">
        {line}
      </span>
    );
  }

  return renderInline(line, keyPrefix);
}

function renderCronLine(line: string, keyPrefix: string): ReactNode {
  const fields = line.trim().split(/\s+/);

  if (fields.length === 5 && fields.every(Boolean)) {
    const fieldClasses = [
      'text-fuchsia-600 dark:text-fuchsia-400',
      'text-sky-600 dark:text-sky-400',
      'text-emerald-700 dark:text-emerald-400',
      'text-amber-700 dark:text-amber-400',
      'text-violet-700 dark:text-violet-400',
    ];

    return fields.map((field, index) => (
      <Fragment key={`${keyPrefix}-${index}`}>
        {index > 0 ? ' ' : null}
        <span className={`font-bold ${fieldClasses[index]}`}>{field}</span>
      </Fragment>
    ));
  }

  return renderKeyValueLine(line, keyPrefix);
}

function renderOutputLine(
  line: string,
  format: ToolOutputFormat,
  keyPrefix: string,
): ReactNode {
  if (format === 'diff') {
    if (line.startsWith('+ ')) {
      return (
        <span className="text-emerald-700 dark:text-emerald-400">{line}</span>
      );
    }

    if (line.startsWith('- ')) {
      return <span className="text-rose-700 dark:text-rose-400">{line}</span>;
    }

    if (line.trim() && !line.startsWith('  ')) {
      return (
        <span className="font-semibold text-violet-700 dark:text-violet-400">
          {line}
        </span>
      );
    }
  }

  if (format === 'json') {
    return renderJsonLine(line, keyPrefix);
  }

  if (format === 'typescript') {
    return renderCodeLine(line, keyPrefix);
  }

  if (format === 'jwt') {
    if (/^\s*(?:\{|\}|\[|\])/.test(line) || /"[^"\n]+"\s*:/.test(line)) {
      return renderJsonLine(line, keyPrefix);
    }

    if (line.trim() && !line.includes(': ')) {
      return (
        <span className="font-semibold text-violet-700 dark:text-violet-400">
          {line}
        </span>
      );
    }

    return renderKeyValueLine(line, keyPrefix);
  }

  if (format === 'regex') {
    if (/^#\d+/.test(line)) {
      return (
        <span className="font-semibold text-fuchsia-700 dark:text-fuchsia-400">
          {renderInline(line, keyPrefix)}
        </span>
      );
    }

    return renderKeyValueLine(line, keyPrefix);
  }

  if (format === 'key-value' || format === 'url') {
    return renderKeyValueLine(line, keyPrefix);
  }

  if (format === 'cron') {
    return renderCronLine(line, keyPrefix);
  }

  if (
    format === 'secret' ||
    format === 'hash' ||
    format === 'uuid' ||
    format === 'base64'
  ) {
    return (
      <span
        className={
          format === 'secret'
            ? 'font-semibold tracking-wide text-fuchsia-700 dark:text-fuchsia-300'
            : 'font-medium text-sky-700 dark:text-sky-300'
        }
      >
        {line}
      </span>
    );
  }

  return renderInline(line, keyPrefix);
}

export function ToolOutput({
  content,
  label,
  format = 'plain',
  tone = 'accent',
}: ToolOutputProps) {
  const { copy } = useLocale();
  const [isCopied, setIsCopied] = useState(false);
  const lines = content.split('\n');
  const showLineNumbers = [
    'json',
    'typescript',
    'diff',
    'jwt',
    'regex',
  ].includes(format);

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 2_000);
    } catch {
      setIsCopied(false);
    }
  }

  return (
    <Card
      variant="secondary"
      className={`${toolPanelClassName} overflow-hidden`}
    >
      <Card.Header className="flex-row items-center justify-between gap-3 pb-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className={`size-2.5 shrink-0 rounded-full shadow-[0_0_18px_currentColor] ${
              tone === 'success'
                ? 'bg-emerald-500 text-emerald-500'
                : 'bg-accent text-accent'
            }`}
          />
          <Card.Title className="truncate">
            {label ?? copy.tool.output}
          </Card.Title>
        </div>
        <Button
          isIconOnly
          aria-label={copy.tool.copyOutput}
          size="sm"
          variant="tertiary"
          onPress={() => void copyOutput()}
        >
          {isCopied ? <Check /> : <Copy />}
        </Button>
      </Card.Header>
      <Card.Content className="pt-0">
        <div
          className={`${toolInsetClassName} relative max-h-96 overflow-auto rounded-2xl px-3 py-3.5 font-mono text-[0.8125rem] leading-6 sm:px-4 sm:text-sm`}
        >
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-50 ${
              tone === 'success' ? 'text-emerald-500' : 'text-accent'
            }`}
          />
          <code className="block min-w-full whitespace-pre-wrap break-words">
            {lines.map((line, index) => (
              <span
                key={`${index}-${line}`}
                className={`grid min-h-6 ${
                  showLineNumbers
                    ? 'grid-cols-[2.25rem_minmax(0,1fr)] gap-3'
                    : 'grid-cols-1'
                } ${
                  format === 'diff' && line.startsWith('+ ')
                    ? '-mx-3 bg-emerald-500/10 px-3 sm:-mx-4 sm:px-4'
                    : format === 'diff' && line.startsWith('- ')
                      ? '-mx-3 bg-rose-500/10 px-3 sm:-mx-4 sm:px-4'
                      : ''
                }`}
              >
                {showLineNumbers ? (
                  <span
                    aria-hidden="true"
                    className="select-none text-right text-muted/60"
                  >
                    {index + 1}
                  </span>
                ) : null}
                <span className="min-w-0 whitespace-pre-wrap break-all">
                  {line
                    ? renderOutputLine(line, format, `line-${index}`)
                    : '\u00A0'}
                </span>
              </span>
            ))}
          </code>
        </div>
      </Card.Content>
    </Card>
  );
}

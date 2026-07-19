'use client';

import { useLocale } from '@/app/providers';
import { Button, Card } from '@heroui/react';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

type ToolOutputProps = {
  content: string;
  label?: string;
};

export function ToolOutput({ content, label }: ToolOutputProps) {
  const { copy } = useLocale();
  const [isCopied, setIsCopied] = useState(false);

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
    <Card variant="secondary">
      <Card.Header className="flex-row items-center justify-between gap-3">
        <Card.Title>{label ?? copy.tool.output}</Card.Title>
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
      <Card.Content>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-default-soft p-3 text-sm leading-6">
          {content}
        </pre>
      </Card.Content>
    </Card>
  );
}

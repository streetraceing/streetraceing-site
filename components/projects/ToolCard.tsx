'use client';

import { Card, Chip } from '@heroui/react';
import { ArrowUpRight, Clock3 } from 'lucide-react';
import Link from 'next/link';

import type { ToolConfig } from '@/utils/config';
import { useLocale } from '@/app/providers';
import { getText } from '@/utils/i18n';

type ToolCardProps = {
  tool: ToolConfig;
};

export function ToolCard({ tool }: ToolCardProps) {
  const { copy, locale } = useLocale();
  const card = (
    <Card
      variant="secondary"
      className={
        tool.status === 'planned'
          ? 'h-full border border-dashed border-border/90 bg-surface-secondary opacity-80 shadow-sm transition-colors dark:bg-white/[0.04]'
          : 'h-full border border-border/80 bg-surface-secondary shadow-sm transition-[background-color,border-color,box-shadow] group-hover:border-accent/40 group-hover:bg-surface-tertiary group-hover:shadow-md group-focus-visible:border-accent group-focus-visible:bg-surface-tertiary dark:bg-white/[0.05] dark:group-hover:bg-white/[0.085]'
      }
    >
      <Card.Header className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {tool.icon && (
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-default">
                <tool.icon className="size-5" />
              </span>
            )}
            <Card.Title className="truncate">
              {getText(tool.name, locale)}
            </Card.Title>
          </div>
          {tool.status === 'available' ? (
            <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted" />
          ) : (
            <Clock3 className="mt-1 size-4 shrink-0 text-muted" />
          )}
        </div>
        <Chip
          color={tool.status === 'available' ? 'success' : 'warning'}
          variant="soft"
          size="sm"
          className="px-2 py-1"
        >
          {tool.status === 'available'
            ? copy.tool.available
            : copy.tool.planned}
        </Chip>
        <Card.Description>{getText(tool.description, locale)}</Card.Description>
      </Card.Header>
      <Card.Content className="mt-auto">
        <div className="flex flex-wrap gap-2">
          {tool.tags.map((tag) => (
            <Chip key={tag.ru} size="sm" variant="secondary">
              {getText(tag, locale)}
            </Chip>
          ))}
        </div>
      </Card.Content>
    </Card>
  );

  if (tool.status === 'planned') {
    return <div aria-disabled="true">{card}</div>;
  }

  return (
    <Link
      href={`/tool/${tool.slug}`}
      className="group block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {card}
    </Link>
  );
}

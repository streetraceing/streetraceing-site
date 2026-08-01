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
          ? 'h-full border-0 bg-surface-secondary/75 opacity-75 shadow-sm transition-[background-color,box-shadow] dark:bg-white/4'
          : 'h-full border-0 bg-surface-secondary/90 shadow-[0_12px_34px_rgba(15,23,42,0.07)] transition-[background-color,box-shadow,transform] group-hover:-translate-y-0.5 group-hover:bg-surface-tertiary group-hover:shadow-[0_18px_46px_rgba(15,23,42,0.11)] group-focus-visible:bg-surface-tertiary dark:bg-white/5.5 dark:group-hover:bg-white/9 dark:group-hover:shadow-[0_20px_48px_rgba(0,0,0,0.28)]'
      }
    >
      <Card.Header className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {tool.icon && (
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
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
      className="group block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border"
    >
      {card}
    </Link>
  );
}

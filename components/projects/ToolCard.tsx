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
  const { locale } = useLocale();
  const card = (
    <Card
      variant="secondary"
      className={
        tool.status === 'planned'
          ? 'h-full border-0 dark:bg-default/20 opacity-70 shadow-sm transition-[background-color,box-shadow]'
          : 'h-full border-0 dark:bg-default/20 dark:hover:bg-default/50 dark:focus-visible:bg-default/50 hover:bg-white/50 transition-[background-color,box-shadow,transform] group-hover:bg-surface-tertiary group-focus-visible:bg-surface-tertiary'
      }
    >
      <Card.Header className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {tool.icon && (
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-tertiary text-foreground shadow-sm">
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

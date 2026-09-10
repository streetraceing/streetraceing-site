'use client';

import { useLocale } from '@/app/providers';
import type { ToolConfig } from '@/utils/config';
import { getText } from '@/utils/i18n';
import { getToolHref } from '@/utils/tool-catalog';
import { Card, Chip, cn } from '@heroui/react';
import { ArrowUpRight, Clock3 } from 'lucide-react';
import Link from 'next/link';

type ToolCardProps = {
  tool: ToolConfig;
  featured?: boolean;
};

export function ToolCard({ tool, featured = false }: ToolCardProps) {
  const { copy, locale } = useLocale();
  const title = getText(tool.name, locale);
  const card = (
    <Card
      variant={featured ? 'default' : 'secondary'}
      className={cn(
        'relative h-full overflow-hidden border-0 transition-[background-color,box-shadow,transform] duration-200',
        tool.status === 'planned'
          ? 'opacity-70 shadow-sm'
          : 'group-hover:-translate-y-0.5 group-hover:bg-surface-tertiary group-hover:shadow-md group-focus-visible:-translate-y-0.5 group-focus-visible:bg-surface-tertiary group-focus-visible:shadow-md',
        featured && 'min-h-64 shadow-sm',
      )}
    >
      <Card.Header className="gap-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold tracking-wider text-muted uppercase">
            {copy.toolsPage.categories[tool.category]}
          </span>
          {tool.status === 'available' ? (
            <ArrowUpRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          ) : (
            <Clock3 className="size-4 shrink-0 text-muted" />
          )}
        </div>

        <div className="flex items-start gap-3">
          {tool.icon ? (
            <span
              className={cn(
                'grid shrink-0 place-items-center bg-surface-tertiary text-foreground shadow-sm',
                featured ? 'size-12 rounded-2xl' : 'size-10 rounded-xl',
              )}
            >
              <tool.icon className={featured ? 'size-6' : 'size-5'} />
            </span>
          ) : null}
          <div className="flex min-w-0 flex-col gap-1">
            <Card.Title className="truncate">{title}</Card.Title>
            <Card.Description>
              {getText(tool.description, locale)}
            </Card.Description>
          </div>
        </div>
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
    return (
      <div aria-disabled="true" className="h-full">
        {card}
      </div>
    );
  }

  return (
    <Link
      href={getToolHref(tool)}
      aria-label={title}
      className="group block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {card}
    </Link>
  );
}

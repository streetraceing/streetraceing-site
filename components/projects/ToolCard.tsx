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
  const { locale } = useLocale();
  const title = getText(tool.name, locale);
  const card = (
    <Card
      className={cn(
        'relative h-full overflow-hidden border-0 transition-colors group-hover:bg-white/50 dark:bg-default/20 dark:group-hover:bg-default/50 dark:group-focus-visible:bg-default/50',
        tool.status === 'planned' && 'opacity-70 shadow-sm',
        featured && 'min-h-64',
      )}
    >
      <Card.Header className="gap-4">
        <div className="flex items-start gap-3">
          {tool.icon ? (
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-default shadow-sm">
              <tool.icon className="size-5" />
            </span>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Card.Title className="truncate">{title}</Card.Title>
            <Card.Description>
              {getText(tool.description, locale)}
            </Card.Description>
          </div>
          {tool.status === 'available' ? (
            <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          ) : (
            <Clock3 className="mt-1 size-4 shrink-0 text-muted" />
          )}
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

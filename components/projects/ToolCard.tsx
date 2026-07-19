import { Card, Chip } from '@heroui/react';
import { ArrowUpRight, Clock3 } from 'lucide-react';
import Link from 'next/link';

import type { ToolConfig } from '@/utils/config';

type ToolCardProps = {
  tool: ToolConfig;
};

export function ToolCard({ tool }: ToolCardProps) {
  const card = (
    <Card
      className={
        tool.status === 'planned'
          ? 'h-full border-2 border-dashed opacity-80'
          : 'h-full border-2 transition-colors hover:border-accent/60'
      }
    >
      <Card.Header className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {tool.icon && (
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-default-soft">
                <tool.icon className="size-5" />
              </span>
            )}
            <Card.Title className="truncate">{tool.name}</Card.Title>
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
          {tool.status === 'available' ? 'Доступен' : 'Скоро'}
        </Chip>
        <Card.Description>{tool.description}</Card.Description>
      </Card.Header>
      <Card.Content className="mt-auto">
        <div className="flex flex-wrap gap-2">
          {tool.tags.map((tag) => (
            <Chip key={tag} size="sm" variant="secondary">
              {tag}
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
    <Link href={`/tool/${tool.slug}`} className="block h-full">
      {card}
    </Link>
  );
}

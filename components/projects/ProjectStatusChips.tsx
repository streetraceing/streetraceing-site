'use client';

import { cn, Chip } from '@heroui/react';

import type { ProjectStatus } from '@/utils/config';
import { useLocale } from '@/app/providers';

const projectStatusMeta = {
  'in-development': { color: 'accent' },
  released: { color: 'success' },
  private: { color: 'warning' },
  'closed-source': { color: 'default' },
  'open-source': { color: 'success' },
  maintained: { color: 'accent' },
  archived: { color: 'default' },
  paused: { color: 'warning' },
  planned: { color: 'default' },
  beta: { color: 'warning' },
} as const;

const projectStatusOrder: Record<ProjectStatus, number> = {
  released: 0,
  'open-source': 1,
  'in-development': 10,
  maintained: 11,
  private: 20,
  paused: 21,
  beta: 22,
  'closed-source': 30,
  archived: 31,
  planned: 32,
};

type ProjectStatusChipsProps = {
  statuses: ProjectStatus[];
  className?: string;
};

export function ProjectStatusChips({
  statuses,
  className,
}: ProjectStatusChipsProps) {
  const { copy } = useLocale();
  const sortedStatuses = [...statuses].sort(
    (firstStatus, secondStatus) =>
      projectStatusOrder[firstStatus] - projectStatusOrder[secondStatus],
  );

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {sortedStatuses.map((status) => {
        const meta = projectStatusMeta[status];

        return (
          <Chip key={status} color={meta.color} variant="soft" size="sm">
            {copy.project.status[status]}
          </Chip>
        );
      })}
    </div>
  );
}

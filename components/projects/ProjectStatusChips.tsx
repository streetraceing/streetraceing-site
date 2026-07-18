import { cn, Chip } from '@heroui/react';

import type { ProjectStatus } from '@/utils/config';

const projectStatusMeta = {
  'in-development': { label: 'В разработке', color: 'accent' },
  released: { label: 'Готов', color: 'success' },
  private: { label: 'Приватный', color: 'warning' },
  'closed-source': { label: 'Закрытый код', color: 'default' },
  'open-source': { label: 'Open source', color: 'success' },
  maintained: { label: 'Поддерживается', color: 'accent' },
  archived: { label: 'В архиве', color: 'default' },
  paused: { label: 'На паузе', color: 'warning' },
  planned: { label: 'Запланирован', color: 'default' },
  beta: { label: 'Beta', color: 'warning' },
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
            {meta.label}
          </Chip>
        );
      })}
    </div>
  );
}

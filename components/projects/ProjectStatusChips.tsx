import { cn, Chip } from '@heroui/react';

import type { ProjectStatus } from '@/utils/config';

const projectStatusMeta = {
  'in-development': { label: 'В разработке', color: 'accent' },
  released: { label: 'Готов', color: 'success' },
  private: { label: 'Приватный', color: 'warning' },
  'closed-source': { label: 'Закрытый код', color: 'default' },
  'open-source': { label: 'Open source', color: 'success' },
} as const;

type ProjectStatusChipsProps = {
  statuses: ProjectStatus[];
  className?: string;
};

export function ProjectStatusChips({
  statuses,
  className,
}: ProjectStatusChipsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {statuses.map((status) => {
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

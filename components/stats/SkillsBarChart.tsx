'use client';

import { useLocale } from '@/app/providers';
import { getText } from '@/utils/i18n';
import { developmentDirections } from '@/utils/stats';
import { Card, Chip } from '@heroui/react';

const barToneClasses = {
  accent: 'bg-accent/80 group-hover:bg-accent group-focus-visible:bg-accent',
  success:
    'bg-success/80 group-hover:bg-success group-focus-visible:bg-success',
  warning:
    'bg-warning/80 group-hover:bg-warning group-focus-visible:bg-warning',
  danger: 'bg-danger/80 group-hover:bg-danger group-focus-visible:bg-danger',
  default:
    'bg-foreground/55 group-hover:bg-foreground/75 group-focus-visible:bg-foreground/75',
} as const;

export function SkillsBarChart() {
  const { copy, locale } = useLocale();

  return (
    <Card variant="default" aria-labelledby="skills-chart-heading">
      <Card.Header>
        <Card.Title id="skills-chart-heading">
          {copy.stats.skillsChartTitle}
        </Card.Title>
        <Card.Description>{copy.stats.skillsChartDescription}</Card.Description>
      </Card.Header>

      <Card.Content>
        <div className="grid grid-cols-5 items-end gap-2 sm:gap-4" role="list">
          {developmentDirections.map((direction) => {
            const label = getText(direction.label, locale);

            return (
              <div
                key={direction.id}
                className="group flex min-w-0 flex-col items-center gap-2 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent"
                role="listitem"
                tabIndex={0}
                aria-label={`${label}: ${direction.value}%`}
              >
                <div
                  className="relative flex h-40 w-full items-end justify-center overflow-hidden rounded-xl bg-surface-secondary px-2 pt-9 sm:h-44 sm:px-3"
                  aria-hidden="true"
                >
                  <Chip
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                  >
                    {direction.value}%
                  </Chip>
                  <div
                    className={`w-full max-w-12 rounded-t-lg transition-[height,background-color,transform] duration-200 group-hover:scale-x-105 group-focus-visible:scale-x-105 ${barToneClasses[direction.color]}`}
                    style={{ height: `${direction.value}%` }}
                  />
                </div>
                <span className="min-h-9 max-w-full text-center text-xs font-medium break-words sm:text-sm">
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </Card.Content>
    </Card>
  );
}

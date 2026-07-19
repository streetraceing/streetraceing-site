'use client';

import { useLocale } from '@/app/providers';
import { Label, ProgressBar } from '@heroui/react';

type ProjectProgressProps = {
  value: number;
};

export function ProjectProgress({ value }: ProjectProgressProps) {
  const { copy } = useLocale();
  const color = value === 100 ? 'success' : 'accent';

  return (
    <ProgressBar
      value={value}
      color={color}
      size="sm"
      valueLabel={`${value}%`}
      aria-label={`${copy.project.readiness}: ${value}%`}
      className="rounded-lg bg-default-soft px-3 py-3 gap-2"
    >
      <div className="flex items-center justify-between gap-3 text-xs text-muted">
        <Label>{copy.project.readiness}</Label>
        <ProgressBar.Output />
      </div>
      <ProgressBar.Track>
        <ProgressBar.Fill />
      </ProgressBar.Track>
    </ProgressBar>
  );
}

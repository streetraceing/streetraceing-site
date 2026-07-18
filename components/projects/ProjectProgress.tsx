import { Label, ProgressBar } from '@heroui/react';

type ProjectProgressProps = {
  value: number;
};

export function ProjectProgress({ value }: ProjectProgressProps) {
  const color = value === 100 ? 'success' : 'accent';

  return (
    <ProgressBar
      value={value}
      color={color}
      size="sm"
      valueLabel={`${value}%`}
      aria-label={`Готовность проекта: ${value}%`}
      className="rounded-lg bg-default-soft px-3 py-3 gap-2"
    >
      <div className="flex items-center justify-between gap-3 text-xs text-muted">
        <Label>Готовность</Label>
        <ProgressBar.Output />
      </div>
      <ProgressBar.Track>
        <ProgressBar.Fill />
      </ProgressBar.Track>
    </ProgressBar>
  );
}

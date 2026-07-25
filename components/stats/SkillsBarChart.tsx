'use client';

import { useLocale } from '@/app/providers';
import { Button } from '@/components/ui/Button';
import { getText } from '@/utils/i18n';
import { developmentDirections } from '@/utils/stats';
import { Card, Chip } from '@heroui/react';
import { useState } from 'react';

const segmentToneClasses = {
  accent: 'stroke-accent',
  success: 'stroke-success',
  warning: 'stroke-warning',
  danger: 'stroke-danger',
  default: 'stroke-foreground',
} as const;

const dotToneClasses = {
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  default: 'bg-foreground/60',
} as const;

const chartTotal = developmentDirections.reduce(
  (sum, direction) => sum + direction.value,
  0,
);

const chartSegments = developmentDirections.map((direction, index) => ({
  direction,
  startOffset: developmentDirections
    .slice(0, index)
    .reduce((sum, currentDirection) => sum + currentDirection.value, 0),
}));

export function SkillsBarChart() {
  const { copy, locale } = useLocale();
  const [selectedDirectionId, setSelectedDirectionId] = useState<string>();
  const [previewDirectionId, setPreviewDirectionId] = useState<string>();
  const activeDirectionId = previewDirectionId ?? selectedDirectionId;
  const activeDirection = developmentDirections.find(
    (direction) => direction.id === activeDirectionId,
  );
  const activeLabel = activeDirection
    ? getText(activeDirection.label, locale)
    : copy.stats.skillsChartTitle;

  function toggleDirection(directionId: string) {
    setSelectedDirectionId((currentDirectionId) =>
      currentDirectionId === directionId ? undefined : directionId,
    );
  }

  function showPointerPreview(directionId: string, pointerType: string) {
    if (pointerType === 'mouse') {
      setPreviewDirectionId(directionId);
    }
  }

  function hidePointerPreview(pointerType: string) {
    if (pointerType === 'mouse') {
      setPreviewDirectionId(undefined);
    }
  }

  return (
    <Card
      variant="default"
      aria-labelledby="skills-chart-heading"
      className="dark:bg-default/15"
    >
      <Card.Header>
        <Card.Title id="skills-chart-heading">
          {copy.stats.skillsChartTitle}
        </Card.Title>
        <Card.Description>{copy.stats.skillsChartDescription}</Card.Description>
      </Card.Header>

      <Card.Content className="grid gap-6 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] md:items-center">
        <div className="relative mx-auto aspect-square w-full max-w-64">
          <svg
            viewBox="0 0 128 128"
            className="size-full"
            role="group"
            aria-label={copy.stats.skillsChartDescription}
          >
            <circle
              cx="64"
              cy="64"
              r="44"
              fill="none"
              strokeWidth="14"
              className="stroke-surface-secondary"
            />

            {chartSegments.map(({ direction, startOffset }) => {
              const visibleValue = Math.max(direction.value - 0.8, 0);
              const isActive = activeDirectionId === direction.id;
              const isSelected = selectedDirectionId === direction.id;
              const isDimmed =
                activeDirectionId !== undefined &&
                activeDirectionId !== direction.id;
              const label = getText(direction.label, locale);

              return (
                <circle
                  key={direction.id}
                  cx="64"
                  cy="64"
                  r="44"
                  fill="none"
                  pathLength={chartTotal}
                  strokeWidth="14"
                  strokeLinecap="butt"
                  strokeDasharray={`${visibleValue} ${chartTotal - visibleValue}`}
                  strokeDashoffset={-startOffset}
                  transform="rotate(-90 64 64)"
                  tabIndex={0}
                  role="button"
                  aria-label={`${label}: ${direction.value}%`}
                  aria-pressed={isSelected}
                  className={`${segmentToneClasses[direction.color]} cursor-pointer transition-opacity duration-200 focus:outline-none ${
                    isDimmed
                      ? 'opacity-25'
                      : isActive
                        ? 'opacity-100'
                        : 'opacity-90'
                  }`}
                  onClick={() => toggleDirection(direction.id)}
                  onPointerEnter={(event) =>
                    showPointerPreview(direction.id, event.pointerType)
                  }
                  onPointerLeave={(event) =>
                    hidePointerPreview(event.pointerType)
                  }
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') {
                      return;
                    }

                    event.preventDefault();
                    toggleDirection(direction.id);
                  }}
                />
              );
            })}
          </svg>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-semibold">
              {activeDirection?.value ?? chartTotal}%
            </span>
            <span className="max-w-24 text-xs text-muted">{activeLabel}</span>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {developmentDirections.map((direction) => {
            const label = getText(direction.label, locale);
            const isActive = activeDirectionId === direction.id;
            const isSelected = selectedDirectionId === direction.id;

            return (
              <Button
                key={direction.id}
                type="button"
                variant="tertiary"
                aria-label={`${label}: ${direction.value}%`}
                aria-pressed={isSelected}
                className={`h-auto min-w-0 justify-start rounded-xl border px-3 py-2 ${
                  isActive
                    ? 'border-default bg-default'
                    : 'border-transparent bg-surface-secondary/50'
                }`}
                onPress={() => toggleDirection(direction.id)}
                onPointerEnter={(event) =>
                  showPointerPreview(direction.id, event.pointerType)
                }
                onPointerLeave={(event) =>
                  hidePointerPreview(event.pointerType)
                }
                fullWidth
              >
                <span
                  className={`size-3 shrink-0 rounded-full ${dotToneClasses[direction.color]}`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
                  {label}
                </span>
                <Chip size="sm" variant="secondary">
                  {direction.value}%
                </Chip>
              </Button>
            );
          })}
        </div>
      </Card.Content>
    </Card>
  );
}

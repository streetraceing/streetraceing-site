'use client';

import { useLocale } from '@/app/providers';
import { developmentDirections } from '@/utils/stats';
import { getText } from '@/utils/i18n';
import { Typography } from '@heroui/react';

const barToneClasses = {
  accent: 'skill-bar--accent',
  success: 'skill-bar--success',
  warning: 'skill-bar--warning',
  danger: 'skill-bar--danger',
  default: 'skill-bar--default',
} as const;

export function SkillsBarChart() {
  const { copy, locale } = useLocale();

  return (
    <section
      className="cosmic-panel flex flex-col gap-4 p-4 sm:p-5"
      aria-labelledby="skills-chart-heading"
    >
      <div className="flex flex-col gap-1">
        <Typography.Heading id="skills-chart-heading" level={3}>
          {copy.stats.skillsChartTitle}
        </Typography.Heading>
        <Typography.Paragraph className="text-sm text-muted">
          {copy.stats.skillsChartDescription}
        </Typography.Paragraph>
      </div>

      <div className="skill-chart" role="list">
        {developmentDirections.map((direction) => {
          const label = getText(direction.label, locale);

          return (
            <div
              key={direction.id}
              className="skill-chart-item group"
              role="listitem"
              tabIndex={0}
              aria-label={`${label}: ${direction.value}%`}
            >
              <div className="skill-chart-value" aria-hidden="true">
                {direction.value}%
              </div>
              <div className="skill-chart-track" aria-hidden="true">
                <div
                  className={`skill-chart-bar ${barToneClasses[direction.color]}`}
                  style={{ height: `${direction.value}%` }}
                >
                  <span className="skill-chart-glow" />
                </div>
              </div>
              <span className="skill-chart-label">{label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

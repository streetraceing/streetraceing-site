'use client';

import { useLocale } from '@/app/providers';
import { biographySkills } from '@/utils/skills';
import { Card, Typography } from '@heroui/react';

const iconToneClasses = {
  accent: 'bg-accent/15 text-accent',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
  default: 'bg-surface-tertiary text-foreground',
} as const;

const backgroundToneClasses = {
  accent: 'bg-accent/10 hover:bg-accent/20',
  success: 'bg-success/10 hover:bg-success/20',
  warning: 'bg-warning/10 hover:bg-warning/20',
  danger: 'bg-danger/10 hover:bg-danger/20',
  default: 'bg-surface-tertiary/50 hover:bg-surface-tertiary/70',
} as const;

export function SkillsShowcase() {
  const { copy } = useLocale();

  return (
    <section className="flex flex-col gap-3" aria-labelledby="skills-heading">
      <div className="flex flex-col gap-1">
        <Typography.Heading id="skills-heading" level={3}>
          {copy.home.skillsTitle}
        </Typography.Heading>
        <Typography.Paragraph className="text-sm text-muted">
          {copy.home.skillsDescription}
        </Typography.Paragraph>
      </div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {biographySkills.map((skill) => {
          const Icon = skill.icon;

          return (
            <li key={skill.id} className="min-w-0">
              <Card
                variant="secondary"
                className={`min-w-0 transition-colors ${backgroundToneClasses[skill.tone]}`}
                title={skill.label}
              >
                <Card.Content className="flex-row items-center gap-2">
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconToneClasses[skill.tone]}`}
                    aria-hidden="true"
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="truncate text-sm font-medium">
                    {skill.label}
                  </span>
                </Card.Content>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

'use client';

import { useLocale } from '@/app/providers';
import { biographySkillGroups, type SkillTone } from '@/utils/skills';
import { getText } from '@/utils/i18n';
import { Card, Chip, Typography } from '@heroui/react';

const iconToneClasses: Record<SkillTone, string> = {
  accent: 'md:bg-accent/15 text-accent',
  success: 'md:bg-success/15 text-success',
  warning: 'md:bg-warning/15 text-warning',
  danger: 'md:bg-danger/15 text-danger',
  default: 'md:bg-default-hover text-foreground',
};

const backgroundToneClasses: Record<SkillTone, string> = {
  accent: 'md:hover:bg-accent/10',
  success: 'md:hover:bg-success/10',
  warning: 'md:hover:bg-warning/10',
  danger: 'md:hover:bg-danger/10',
  default: 'md:hover:bg-default-hover/25',
};

const chipColors: Record<
  SkillTone,
  'accent' | 'success' | 'warning' | 'danger' | 'default'
> = {
  accent: 'accent',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  default: 'default',
};

export function SkillsShowcase() {
  const { copy, locale } = useLocale();

  return (
    <section
      className="flex flex-col gap-4 border-t pt-4 select-none"
      aria-labelledby="skills-heading"
    >
      <div className="flex flex-col gap-1">
        <Typography.Heading id="skills-heading" level={2}>
          {copy.home.skillsTitle}
        </Typography.Heading>
        <Typography.Paragraph className="text-sm text-muted">
          {copy.home.skillsDescription}
        </Typography.Paragraph>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {biographySkillGroups.map((group) => (
          <section key={group.id} className="flex min-w-0 flex-col gap-2">
            <Chip
              color={chipColors[group.tone]}
              size="sm"
              variant="soft"
              className="w-fit"
            >
              {getText(group.label, locale)}
            </Chip>

            <ul className="grid grid-cols-1 md:gap-2 bg-surface md:bg-transparent rounded-2xl md:grid-cols-2 lg:grid-cols-3">
              {group.skills.map((skill) => {
                const Icon = skill.icon;

                return (
                  <li key={skill.id} className="min-w-0">
                    <Card
                      className={`min-w-0 transition-colors bg-transparent md:bg-surface ${backgroundToneClasses[group.tone]}`}
                      title={skill.label}
                    >
                      <Card.Content className="flex-row items-center gap-2">
                        <span
                          className={`flex size-fit md:size-8 shrink-0 items-center justify-center rounded-lg ${iconToneClasses[group.tone]}`}
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
        ))}
      </div>
    </section>
  );
}

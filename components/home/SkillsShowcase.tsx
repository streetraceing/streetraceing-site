'use client';

import { useLocale } from '@/app/providers';
import { getText } from '@/utils/i18n';
import {
  biographySkillGroups,
  type SkillStyle,
  type SkillVariant,
} from '@/utils/skills';
import { Card, Chip, cn, Typography } from '@heroui/react';

const skillVariantStyles: Record<SkillVariant, SkillStyle> = {
  blue: {
    chip: 'border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    card: 'hover:border-blue-500/25 hover:bg-blue-500/15 bg-blue-500/10',
    icon: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
  },
  green: {
    chip: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    card: 'hover:border-emerald-500/25 hover:bg-emerald-500/15 bg-emerald-500/10',
    icon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  },
  red: {
    chip: 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300',
    card: 'hover:border-red-500/25 hover:bg-red-500/15 bg-red-500/10',
    icon: 'bg-red-500/10 text-red-600 dark:text-red-300',
  },
  purple: {
    chip: 'border-purple-500/25 bg-purple-500/10 text-purple-700 dark:text-purple-300',
    card: 'hover:border-purple-500/25 hover:bg-purple-500/15 bg-purple-500/10',
    icon: 'bg-purple-500/10 text-purple-600 dark:text-purple-300',
  },
  gray: {
    chip: 'border-default/30 bg-default/10 text-foreground',
    card: 'hover:border-default/75 hover:bg-default/50 bg-default/25',
    icon: 'bg-default/15 text-foreground',
  },
  yellow: {
    chip: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    card: 'hover:border-amber-500/25 hover:bg-amber-500/15 bg-amber-500/10',
    icon: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
  },
};

export function SkillsShowcase() {
  const { copy, locale } = useLocale();

  return (
    <section
      className="flex select-none flex-col gap-4 border-t pt-4"
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
        {biographySkillGroups.map((group) => {
          const styles = skillVariantStyles[group.variant];

          return (
            <section key={group.id} className="flex min-w-0 flex-col gap-2">
              <Chip
                size="sm"
                variant="secondary"
                className={cn('w-fit', styles.chip)}
              >
                {getText(group.label, locale)}
              </Chip>

              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.skills.map((skill) => {
                  const Icon = skill.icon;

                  return (
                    <li key={skill.id} className="min-w-0">
                      <Card
                        variant="secondary"
                        className={cn(
                          'min-w-0 border border-transparent transition-colors',
                          styles.card,
                        )}
                        title={skill.label}
                      >
                        <Card.Content className="flex-row items-center gap-2">
                          <span
                            className={cn(
                              'flex size-6 shrink-0 items-center justify-center rounded-lg',
                              styles.icon,
                            )}
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
        })}
      </div>
    </section>
  );
}

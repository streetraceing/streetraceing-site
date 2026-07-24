'use client';

import { useLocale } from '@/app/providers';
import { biographySkills } from '@/utils/skills';
import { Typography } from '@heroui/react';

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

      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7"
        role="list"
      >
        {biographySkills.map((skill) => {
          const Icon = skill.icon;

          return (
            <div
              key={skill.id}
              className={`skill-orbit-card skill-orbit-card--${skill.tone} group`}
              title={skill.label}
              role="listitem"
            >
              <span className="skill-orbit-icon" aria-hidden="true">
                <Icon className="size-5" />
              </span>
              <span className="truncate text-sm font-medium text-foreground">
                {skill.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

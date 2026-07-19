'use client';

import Image from 'next/image';

import { Chip, Typography } from '@heroui/react';
import { Check } from 'lucide-react';

import type { ProjectConfig } from '@/utils/config';
import { useLocale } from '@/app/providers';
import { getText } from '@/utils/i18n';

import { ProjectProgress } from './ProjectProgress';
import { ProjectStatusChips } from './ProjectStatusChips';

type ProjectDetailsProps = {
  project: ProjectConfig;
};

export function ProjectDetails({ project }: ProjectDetailsProps) {
  const { copy, locale } = useLocale();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <ProjectStatusChips statuses={project.status} />
        <Typography.Paragraph>
          {getText(project.longDescription, locale)}
        </Typography.Paragraph>
      </div>

      <ProjectProgress value={project.progress} />

      <section className="flex flex-col gap-3" aria-labelledby="project-stack">
        <Typography.Heading id="project-stack" level={5}>
          {copy.project.stack}
        </Typography.Heading>
        <div className="flex flex-wrap gap-2">
          {project.technologies.map((technology) => (
            <Chip key={technology} size="sm" variant="secondary">
              {technology}
            </Chip>
          ))}
        </div>
      </section>

      <section
        className="flex flex-col gap-3"
        aria-labelledby="project-features"
      >
        <Typography.Heading id="project-features" level={5}>
          {copy.project.highlights}
        </Typography.Heading>
        <ul className="flex flex-col gap-2 text-sm text-muted">
          {project.highlights.map((highlight) => (
            <li key={highlight.ru} className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
              <span>{getText(highlight, locale)}</span>
            </li>
          ))}
        </ul>
      </section>

      {project.screenshots && project.screenshots.length > 0 && (
        <section
          className="flex flex-col gap-3"
          aria-labelledby="project-media"
        >
          <Typography.Heading id="project-media" level={5}>
            {copy.project.screenshots}
          </Typography.Heading>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {project.screenshots.map((screenshot) => (
              <figure key={screenshot.src} className="flex flex-col gap-2">
                <div className="relative aspect-video overflow-hidden rounded-lg border bg-default-soft">
                  <Image
                    src={screenshot.src}
                    alt={getText(screenshot.alt, locale)}
                    fill
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                {screenshot.caption && (
                  <figcaption className="text-xs text-muted">
                    {getText(screenshot.caption, locale)}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      )}

      {project.devLog && project.devLog.length > 0 && (
        <section
          className="flex flex-col gap-3"
          aria-labelledby="project-devlog"
        >
          <Typography.Heading id="project-devlog" level={5}>
            {copy.project.devLog}
          </Typography.Heading>
          <ol className="flex flex-col gap-3 border-l pl-4">
            {project.devLog.map((entry) => (
              <li key={`${entry.date}-${entry.title.ru}`} className="relative">
                <span className="absolute -left-[1.31rem] top-1.5 size-2 rounded-full bg-accent" />
                <p className="text-xs text-muted">{entry.date}</p>
                <p className="font-medium">{getText(entry.title, locale)}</p>
                {entry.description && (
                  <p className="text-sm text-muted">
                    {getText(entry.description, locale)}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

'use client';

import { useId } from 'react';
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
  const id = useId();
  const stackId = `${id}-stack`;
  const featuresId = `${id}-features`;
  const mediaId = `${id}-media`;
  const devLogId = `${id}-devlog`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <ProjectStatusChips statuses={project.status} />
        <Typography.Paragraph>
          {getText(project.longDescription, locale)}
        </Typography.Paragraph>
      </div>

      <ProjectProgress value={project.progress} />

      <section className="flex flex-col gap-3" aria-labelledby={stackId}>
        <Typography.Heading id={stackId} level={3}>
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

      <section className="flex flex-col gap-3" aria-labelledby={featuresId}>
        <Typography.Heading id={featuresId} level={3}>
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

      {project.screenshots && project.screenshots.length > 0 ? (
        <section className="flex flex-col gap-3" aria-labelledby={mediaId}>
          <Typography.Heading id={mediaId} level={3}>
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
                {screenshot.caption ? (
                  <figcaption className="text-xs text-muted">
                    {getText(screenshot.caption, locale)}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {project.devLog && project.devLog.length > 0 ? (
        <section className="flex flex-col gap-3" aria-labelledby={devLogId}>
          <Typography.Heading id={devLogId} level={3}>
            {copy.project.devLog}
          </Typography.Heading>
          <ol className="flex flex-col gap-3 border-l pl-4">
            {project.devLog.map((entry) => (
              <li key={`${entry.date}-${entry.title.ru}`} className="relative">
                <span className="absolute -left-[1.31rem] top-1.5 size-2 rounded-full bg-accent" />
                <p className="text-xs text-muted">{entry.date}</p>
                <p className="font-medium">{getText(entry.title, locale)}</p>
                {entry.description ? (
                  <p className="text-sm text-muted">
                    {getText(entry.description, locale)}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

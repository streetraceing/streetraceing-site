import Image from 'next/image';

import { Chip, Typography } from '@heroui/react';
import { Check } from 'lucide-react';

import type { ProjectConfig } from '@/utils/config';

import { ProjectProgress } from './ProjectProgress';
import { ProjectStatusChips } from './ProjectStatusChips';

type ProjectDetailsProps = {
  project: ProjectConfig;
};

export function ProjectDetails({ project }: ProjectDetailsProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <ProjectStatusChips statuses={project.status} />
        <Typography.Paragraph>{project.longDescription}</Typography.Paragraph>
      </div>

      <ProjectProgress value={project.progress} />

      <section className="flex flex-col gap-3" aria-labelledby="project-stack">
        <Typography.Heading id="project-stack" level={5}>
          Стек
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
          Что умеет
        </Typography.Heading>
        <ul className="flex flex-col gap-2 text-sm text-muted">
          {project.highlights.map((highlight) => (
            <li key={highlight} className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
              <span>{highlight}</span>
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
            Скриншоты
          </Typography.Heading>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {project.screenshots.map((screenshot) => (
              <figure key={screenshot.src} className="flex flex-col gap-2">
                <div className="relative aspect-video overflow-hidden rounded-lg border bg-default-soft">
                  <Image
                    src={screenshot.src}
                    alt={screenshot.alt}
                    fill
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                {screenshot.caption && (
                  <figcaption className="text-xs text-muted">
                    {screenshot.caption}
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
            Dev log
          </Typography.Heading>
          <ol className="flex flex-col gap-3 border-l pl-4">
            {project.devLog.map((entry) => (
              <li key={`${entry.date}-${entry.title}`} className="relative">
                <span className="absolute -left-[1.31rem] top-1.5 size-2 rounded-full bg-accent" />
                <p className="text-xs text-muted">{entry.date}</p>
                <p className="font-medium">{entry.title}</p>
                {entry.description && (
                  <p className="text-sm text-muted">{entry.description}</p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

'use client';

import { Card, Chip, Modal } from '@heroui/react';
import type { CSSProperties } from 'react';
import { ArrowUpRight } from 'lucide-react';

import type { ProjectConfig } from '@/utils/config';
import { useLocale } from '@/app/providers';
import { getText } from '@/utils/i18n';

import { ProjectActions } from './ProjectActions';
import { ProjectDetails } from './ProjectDetails';
import { ProjectProgress } from './ProjectProgress';
import { ProjectStatusChips } from './ProjectStatusChips';

type ProjectCardProps = {
  project: ProjectConfig;
};

export function ProjectCard({ project }: ProjectCardProps) {
  const { copy, locale } = useLocale();

  const gradient = {
    '--project-gradient': `linear-gradient(90deg, ${project.colors.join(', ')})`,
  } as CSSProperties;

  return (
    <Modal>
      <Modal.Trigger className="h-full w-full text-left">
        <Card className="project-card h-full overflow-hidden border-2 transition-transform hover:border-muted/50">
          <Card.Header className="gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                {project.icon && (
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-default">
                    <project.icon className="size-5" />
                  </span>
                )}
                <Card.Title className="truncate">{project.name}</Card.Title>
              </div>
              <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted" />
            </div>
            <ProjectStatusChips statuses={project.status} />
            <Card.Description>
              {getText(project.shortDescription, locale)}
            </Card.Description>
          </Card.Header>
          <Card.Content className="mt-auto flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {project.technologies.slice(0, 3).map((technology) => (
                <Chip key={technology} size="sm" variant="secondary">
                  {technology}
                </Chip>
              ))}
              {project.technologies.length > 3 && (
                <Chip size="sm" variant="secondary">
                  +{project.technologies.length - 3}
                </Chip>
              )}
            </div>
            <ProjectProgress value={project.progress} />
          </Card.Content>
          <Card.Footer className="text-sm text-muted">
            {copy.project.openDetails}
          </Card.Footer>
        </Card>
      </Modal.Trigger>

      <Modal.Backdrop variant="blur">
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] sm:max-w-3xl">
            <Modal.CloseTrigger />
            <Modal.Header>
              {project.icon && (
                <Modal.Icon className="bg-default text-foreground">
                  <project.icon className="size-5" />
                </Modal.Icon>
              )}
              <Modal.Heading>{project.name}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <ProjectDetails project={project} />
            </Modal.Body>
            <Modal.Footer>
              <ProjectActions project={project} />
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

'use client';

import { useLocale } from '@/app/providers';
import { ButtonRipple } from '@/components/ui/Button';
import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Page } from '@/components/layout/Page';
import { MarkdownContent } from '@/components/stats/MarkdownContent';
import { mainPageConfig } from '@/utils/config';
import { getText } from '@/utils/i18n';
import type { ProjectContentData } from '@/utils/project-content';
import type { ProjectDocumentation } from '@/lib/project-documentation';
import { Card, Typography } from '@heroui/react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { ProjectActions } from './ProjectActions';
import { ProjectContentSection } from './ProjectContentSection';
import { ProjectDetails } from './ProjectDetails';

export function ProjectPageContent({
  slug,
  initialContent,
  documentation,
}: {
  slug: string;
  initialContent: ProjectContentData;
  documentation?: ProjectDocumentation;
}) {
  const { copy, locale } = useLocale();
  const project = mainPageConfig.projects.find(
    (currentProject) => currentProject.slug === slug,
  );

  if (!project) {
    return null;
  }

  return (
    <Page header={<Header />} footer={<Footer />}>
      <Container className="flex flex-col gap-4 py-4">
        <Link
          href="/#projects"
          className="button button--tertiary button--md self-start"
        >
          <ButtonRipple />
          <ArrowLeft className="size-4" />
          {copy.project.allProjects}
        </Link>

        <Card className="mx-auto w-full max-w-4xl">
          <Card.Header className="gap-3">
            <div className="flex items-start gap-3">
              {project.icon && (
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-default-soft">
                  <project.icon className="size-6" />
                </span>
              )}
              <div className="flex min-w-0 flex-col gap-1">
                <Typography.Heading level={2}>
                  {project.name}
                </Typography.Heading>
                <Card.Description>
                  {getText(project.shortDescription, locale)}
                </Card.Description>
              </div>
            </div>
          </Card.Header>
          <Card.Content>
            <ProjectDetails project={project} />
          </Card.Content>
          <Card.Footer>
            <ProjectActions project={project} />
          </Card.Footer>
        </Card>

        {documentation ? (
          <Card className="mx-auto w-full max-w-4xl">
            <Card.Content>
              <MarkdownContent
                content={documentation.content}
                baseUrl={documentation.sourceUrl}
              />
            </Card.Content>
          </Card>
        ) : null}

        <div className="mx-auto w-full max-w-4xl">
          <ProjectContentSection
            key={project.slug}
            project={project}
            initialContent={initialContent}
          />
        </div>
      </Container>
    </Page>
  );
}

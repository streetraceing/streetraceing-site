'use client';

import { useLocale } from '@/app/providers';
import { ButtonRipple } from '@/components/ui/Button';
import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Page } from '@/components/layout/Page';
import { getText } from '@/utils/i18n';
import { getProjectBySlug } from '@/utils/project-catalog';
import type { ProjectContentData } from '@/utils/project-content';
import type { ProjectDocumentation } from '@/utils/project-documentation';
import { Card, Typography } from '@heroui/react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { ProjectActions } from './ProjectActions';
import { ProjectContentSection } from './ProjectContentSection';
import { ProjectDocumentationViewer } from './ProjectDocumentationViewer';
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
  const project = getProjectBySlug(slug);

  if (!project) {
    return null;
  }

  return (
    <Page header={<Header />} footer={<Footer />}>
      <Container className="flex flex-col gap-5 py-6 sm:py-10">
        <Link
          href="/#projects"
          className="button button--tertiary button--md self-start"
        >
          <ButtonRipple />
          <ArrowLeft className="size-4" />
          {copy.project.allProjects}
        </Link>

        <Card className="mx-auto w-full max-w-4xl overflow-hidden">
          <Card.Header className="relative gap-3 border-b bg-surface-secondary/45 py-6 sm:py-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-accent/10 blur-3xl"
            />
            <div className="flex items-start gap-3">
              {project.icon && (
                <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-default shadow-sm">
                  <project.icon className="size-6" />
                </span>
              )}
              <div className="relative flex min-w-0 flex-col gap-1">
                <Typography.Heading level={1}>
                  {project.name}
                </Typography.Heading>
                <Card.Description>
                  {getText(project.shortDescription, locale)}
                </Card.Description>
              </div>
            </div>
          </Card.Header>
          <Card.Content className="py-5 sm:py-6">
            <ProjectDetails project={project} sectionHeadingLevel={2} />
          </Card.Content>
          <Card.Footer>
            <ProjectActions project={project} />
          </Card.Footer>
        </Card>

        {documentation ? (
          <Card className="mx-auto w-full max-w-4xl">
            <Card.Content>
              <ProjectDocumentationViewer
                key={`${project.slug}:${documentation.sourceUrl}`}
                projectSlug={project.slug}
                initialDocumentation={documentation}
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

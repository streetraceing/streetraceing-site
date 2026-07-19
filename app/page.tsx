'use client';

import { useLocale } from '@/app/providers';
import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Page } from '@/components/layout/Page';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ToolCard } from '@/components/projects/ToolCard';
import { StatsSection } from '@/components/stats/StatsSection';
import { mainPageConfig, type ProjectStatus } from '@/utils/config';
import { getText } from '@/utils/i18n';
import { Button, Card, Label, SearchField, Typography } from '@heroui/react';
import { useMemo, useState } from 'react';

const projectStatuses = Array.from(
  new Set(mainPageConfig.projects.flatMap((project) => project.status)),
);

const toolTags = mainPageConfig.tools
  .flatMap((tool) => tool.tags)
  .filter(
    (tag, index, tags) =>
      tags.findIndex((candidate) => candidate.ru === tag.ru) === index,
  );

function includesQuery(query: string, values: string[]) {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return (
    normalizedQuery.length === 0 ||
    values.some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
  );
}

export default function HomePage() {
  const { copy, locale } = useLocale();
  const [projectQuery, setProjectQuery] = useState('');
  const [selectedProjectStatus, setSelectedProjectStatus] = useState<
    ProjectStatus | undefined
  >();
  const [toolQuery, setToolQuery] = useState('');
  const [selectedToolTag, setSelectedToolTag] = useState<string>();

  const filteredProjects = useMemo(
    () =>
      mainPageConfig.projects.filter(
        (project) =>
          (!selectedProjectStatus ||
            project.status.includes(selectedProjectStatus)) &&
          includesQuery(projectQuery, [
            project.name,
            getText(project.shortDescription, locale),
            getText(project.longDescription, locale),
            ...project.technologies,
            ...project.status.map((status) => copy.project.status[status]),
            ...project.highlights.map((highlight) =>
              getText(highlight, locale),
            ),
          ]),
      ),
    [copy.project.status, locale, projectQuery, selectedProjectStatus],
  );

  const filteredTools = useMemo(
    () =>
      mainPageConfig.tools.filter(
        (tool) =>
          (!selectedToolTag ||
            tool.tags.some((tag) => tag.ru === selectedToolTag)) &&
          includesQuery(toolQuery, [
            getText(tool.name, locale),
            getText(tool.description, locale),
            ...tool.tags.map((tag) => getText(tag, locale)),
          ]),
      ),
    [locale, selectedToolTag, toolQuery],
  );

  return (
    <Page header={<Header />} footer={<Footer />}>
      <Container className="py-4 gap-4 flex flex-col">
        <Typography.Paragraph>{copy.home.intro}</Typography.Paragraph>

        <section
          id="bio"
          className="scroll-mt-16 flex flex-col gap-4 pt-4 border-t"
        >
          <Typography.Heading level={3}>
            {copy.home.bioTitle}
          </Typography.Heading>

          <div className="flex gap-4 h-fit flex-col md:flex-row md:h-48">
            <ProfileAvatar />
            <div className="flex flex-col gap-3">
              {copy.home.bio.map((paragraph) => (
                <Typography.Paragraph key={paragraph}>
                  {paragraph}
                </Typography.Paragraph>
              ))}
            </div>
          </div>
        </section>

        <StatsSection />

        <section
          id="projects"
          className="scroll-mt-16 flex flex-col gap-4 pt-4 border-t"
        >
          <Typography.Heading level={3}>
            {copy.home.projectsTitle.replace(
              '{count}',
              String(mainPageConfig.projects.length),
            )}
          </Typography.Heading>

          <div className="flex flex-col gap-3">
            <SearchField
              value={projectQuery}
              onChange={setProjectQuery}
              fullWidth
            >
              <Label className="sr-only">{copy.home.projectsSearchLabel}</Label>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input
                  placeholder={copy.home.projectsSearchPlaceholder}
                />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>

            <div
              className="flex flex-wrap gap-2"
              aria-label={copy.home.projectsFilters}
            >
              <Button
                type="button"
                size="sm"
                variant={
                  selectedProjectStatus === undefined ? 'primary' : 'secondary'
                }
                onPress={() => setSelectedProjectStatus(undefined)}
              >
                {copy.home.all}
              </Button>
              {projectStatuses.map((status) => (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant={
                    selectedProjectStatus === status ? 'primary' : 'secondary'
                  }
                  onPress={() => setSelectedProjectStatus(status)}
                >
                  {copy.project.status[status]}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
            {filteredProjects.length === 0 && (
              <Card variant="secondary">
                <Card.Content className="text-sm text-muted">
                  {copy.home.noProjects}
                </Card.Content>
              </Card>
            )}
          </div>
        </section>

        <section
          id="tools"
          className="scroll-mt-16 flex flex-col gap-4 pt-4 border-t"
        >
          <Typography.Heading level={3}>
            {copy.home.toolsTitle.replace(
              '{count}',
              String(mainPageConfig.tools.length),
            )}
          </Typography.Heading>

          <div className="flex flex-col gap-3">
            <SearchField value={toolQuery} onChange={setToolQuery} fullWidth>
              <Label className="sr-only">{copy.home.toolsSearchLabel}</Label>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input
                  placeholder={copy.home.toolsSearchPlaceholder}
                />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>

            <div
              className="flex flex-wrap gap-2"
              aria-label={copy.home.toolsFilters}
            >
              <Button
                type="button"
                size="sm"
                variant={
                  selectedToolTag === undefined ? 'primary' : 'secondary'
                }
                onPress={() => setSelectedToolTag(undefined)}
              >
                {copy.home.all}
              </Button>
              {toolTags.map((tag) => (
                <Button
                  key={tag.ru}
                  type="button"
                  size="sm"
                  variant={selectedToolTag === tag.ru ? 'primary' : 'secondary'}
                  onPress={() => setSelectedToolTag(tag.ru)}
                >
                  {getText(tag, locale)}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {filteredTools.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
            {filteredTools.length === 0 && (
              <Card variant="secondary">
                <Card.Content className="text-sm text-muted">
                  {copy.home.noTools}
                </Card.Content>
              </Card>
            )}
          </div>
        </section>
      </Container>
    </Page>
  );
}

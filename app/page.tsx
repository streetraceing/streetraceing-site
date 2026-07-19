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
import {
  mainPageConfig,
  type ProjectConfig,
  type ProjectStatus,
  type ToolConfig,
} from '@/utils/config';
import { getLocaleTag, getText } from '@/utils/i18n';
import {
  Button,
  Card,
  Label,
  ListBox,
  SearchField,
  Select,
  Typography,
} from '@heroui/react';
import Fuse from 'fuse.js';
import { X } from 'lucide-react';
import { useMemo, useState } from 'react';

type ProjectSort = 'relevance' | 'progress-desc' | 'name-asc';
type ToolSort = 'relevance' | 'name-asc';

type ProjectSearchItem = {
  project: ProjectConfig;
  name: string;
  description: string;
  technologies: string[];
  statuses: string[];
  highlights: string[];
};

type ToolSearchItem = {
  tool: ToolConfig;
  name: string;
  description: string;
  tags: string[];
};

const projectStatuses = Array.from(
  new Set(mainPageConfig.projects.flatMap((project) => project.status)),
);

const toolTags = mainPageConfig.tools
  .flatMap((tool) => tool.tags)
  .filter(
    (tag, index, tags) =>
      tags.findIndex((candidate) => candidate.ru === tag.ru) === index,
  );

export default function HomePage() {
  const { copy, locale } = useLocale();
  const [projectQuery, setProjectQuery] = useState('');
  const [selectedProjectStatus, setSelectedProjectStatus] = useState<
    ProjectStatus | undefined
  >();
  const [projectSort, setProjectSort] = useState<ProjectSort>('relevance');
  const [toolQuery, setToolQuery] = useState('');
  const [selectedToolTag, setSelectedToolTag] = useState<string>();
  const [toolSort, setToolSort] = useState<ToolSort>('relevance');

  const projectSearch = useMemo(
    () =>
      new Fuse<ProjectSearchItem>(
        mainPageConfig.projects.map((project) => ({
          project,
          name: project.name,
          description: [
            getText(project.shortDescription, locale),
            getText(project.longDescription, locale),
          ].join(' '),
          technologies: project.technologies,
          statuses: project.status.map((status) => copy.project.status[status]),
          highlights: project.highlights.map((highlight) =>
            getText(highlight, locale),
          ),
        })),
        {
          keys: [
            { name: 'name', weight: 0.5 },
            { name: 'technologies', weight: 0.2 },
            { name: 'statuses', weight: 0.15 },
            { name: 'description', weight: 0.1 },
            { name: 'highlights', weight: 0.05 },
          ],
          threshold: 0.35,
          ignoreLocation: true,
        },
      ),
    [copy.project.status, locale],
  );

  const toolSearch = useMemo(
    () =>
      new Fuse<ToolSearchItem>(
        mainPageConfig.tools.map((tool) => ({
          tool,
          name: getText(tool.name, locale),
          description: getText(tool.description, locale),
          tags: tool.tags.map((tag) => getText(tag, locale)),
        })),
        {
          keys: [
            { name: 'name', weight: 0.55 },
            { name: 'tags', weight: 0.3 },
            { name: 'description', weight: 0.15 },
          ],
          threshold: 0.35,
          ignoreLocation: true,
        },
      ),
    [locale],
  );

  const filteredProjects = useMemo(() => {
    const projects = projectQuery.trim()
      ? projectSearch.search(projectQuery).map(({ item }) => item.project)
      : mainPageConfig.projects;

    const filtered = projects.filter(
      (project) =>
        !selectedProjectStatus ||
        project.status.includes(selectedProjectStatus),
    );

    if (projectSort === 'progress-desc') {
      return [...filtered].sort(
        (firstProject, secondProject) =>
          secondProject.progress - firstProject.progress,
      );
    }

    if (projectSort === 'name-asc') {
      return [...filtered].sort((firstProject, secondProject) =>
        firstProject.name.localeCompare(
          secondProject.name,
          getLocaleTag(locale),
        ),
      );
    }

    return filtered;
  }, [locale, projectQuery, projectSearch, projectSort, selectedProjectStatus]);

  const filteredTools = useMemo(() => {
    const tools = toolQuery.trim()
      ? toolSearch.search(toolQuery).map(({ item }) => item.tool)
      : mainPageConfig.tools;

    const filtered = tools.filter(
      (tool) =>
        !selectedToolTag || tool.tags.some((tag) => tag.ru === selectedToolTag),
    );

    return toolSort === 'name-asc'
      ? [...filtered].sort((firstTool, secondTool) =>
          getText(firstTool.name, locale).localeCompare(
            getText(secondTool.name, locale),
            getLocaleTag(locale),
          ),
        )
      : filtered;
  }, [locale, selectedToolTag, toolQuery, toolSearch, toolSort]);

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

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <div
                  className="flex flex-wrap gap-2"
                  aria-label={copy.home.projectsFilters}
                >
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      selectedProjectStatus === undefined
                        ? 'primary'
                        : 'secondary'
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
                        selectedProjectStatus === status
                          ? 'primary'
                          : 'secondary'
                      }
                      onPress={() => setSelectedProjectStatus(status)}
                    >
                      {copy.project.status[status]}
                    </Button>
                  ))}
                  {selectedProjectStatus && (
                    <Button
                      aria-label={copy.home.clearFilters}
                      isIconOnly
                      type="button"
                      size="sm"
                      variant="tertiary"
                      onPress={() => setSelectedProjectStatus(undefined)}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-end gap-2 sm:shrink-0">
                <Select
                  className="min-w-0 flex-1 sm:w-72 sm:flex-none"
                  value={projectSort}
                  variant="secondary"
                  onChange={(value) => {
                    if (typeof value === 'string') {
                      setProjectSort(value as ProjectSort);
                    }
                  }}
                >
                  <Label className="sm:sr-only">{copy.home.projectsSort}</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item
                        id="relevance"
                        textValue={copy.home.sortRelevance}
                      >
                        {copy.home.sortRelevance}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                      <ListBox.Item
                        id="progress-desc"
                        textValue={copy.home.sortProgress}
                      >
                        {copy.home.sortProgress}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                      <ListBox.Item
                        id="name-asc"
                        textValue={copy.home.sortName}
                      >
                        {copy.home.sortName}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    </ListBox>
                  </Select.Popover>
                </Select>
                {projectSort !== 'relevance' && (
                  <Button
                    aria-label={copy.home.clearSort}
                    isIconOnly
                    type="button"
                    size="sm"
                    variant="tertiary"
                    onPress={() => setProjectSort('relevance')}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
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

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
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
                      variant={
                        selectedToolTag === tag.ru ? 'primary' : 'secondary'
                      }
                      onPress={() => setSelectedToolTag(tag.ru)}
                    >
                      {getText(tag, locale)}
                    </Button>
                  ))}
                  {selectedToolTag && (
                    <Button
                      aria-label={copy.home.clearFilters}
                      isIconOnly
                      type="button"
                      size="sm"
                      variant="tertiary"
                      onPress={() => setSelectedToolTag(undefined)}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-end gap-2 sm:shrink-0">
                <Select
                  className="min-w-0 flex-1 sm:w-72 sm:flex-none"
                  value={toolSort}
                  variant="secondary"
                  onChange={(value) => {
                    if (typeof value === 'string') {
                      setToolSort(value as ToolSort);
                    }
                  }}
                >
                  <Label className="sm:sr-only">{copy.home.toolsSort}</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item
                        id="relevance"
                        textValue={copy.home.sortRelevance}
                      >
                        {copy.home.sortRelevance}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                      <ListBox.Item
                        id="name-asc"
                        textValue={copy.home.sortName}
                      >
                        {copy.home.sortName}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    </ListBox>
                  </Select.Popover>
                </Select>
                {toolSort !== 'relevance' && (
                  <Button
                    aria-label={copy.home.clearSort}
                    isIconOnly
                    type="button"
                    size="sm"
                    variant="tertiary"
                    onPress={() => setToolSort('relevance')}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
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

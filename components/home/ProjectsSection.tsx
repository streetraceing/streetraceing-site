'use client';

import { useLocale } from '@/app/providers';
import { ProjectCard } from '@/components/projects/ProjectCard';
import {
  mainPageConfig,
  type ProjectConfig,
  type ProjectStatus,
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

type ProjectSearchItem = {
  project: ProjectConfig;
  name: string;
  description: string;
  technologies: string[];
  statuses: string[];
  highlights: string[];
};

const ALL_FILTER_ID = 'all';
const projectStatuses = Array.from(
  new Set(mainPageConfig.projects.flatMap((project) => project.status)),
);

export function ProjectsSection() {
  const { copy, locale } = useLocale();
  const [query, setQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus>();
  const [sort, setSort] = useState<ProjectSort>('relevance');

  const search = useMemo(
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

  const projects = useMemo(() => {
    const matched = query.trim()
      ? search.search(query).map(({ item }) => item.project)
      : mainPageConfig.projects;
    const filtered = matched.filter(
      (project) => !selectedStatus || project.status.includes(selectedStatus),
    );

    if (sort === 'progress-desc') {
      return [...filtered].sort(
        (firstProject, secondProject) =>
          secondProject.progress - firstProject.progress,
      );
    }

    if (sort === 'name-asc') {
      return [...filtered].sort((firstProject, secondProject) =>
        firstProject.name.localeCompare(
          secondProject.name,
          getLocaleTag(locale),
        ),
      );
    }

    return filtered;
  }, [locale, query, search, selectedStatus, sort]);

  return (
    <section
      id="projects"
      className="scroll-mt-16 flex flex-col gap-4 border-t pt-4"
    >
      <Typography.Heading level={2}>
        {copy.home.projectsTitle.replace(
          '{count}',
          String(mainPageConfig.projects.length),
        )}
      </Typography.Heading>

      <div className="flex flex-col gap-3">
        <SearchField value={query} onChange={setQuery} fullWidth>
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
          <div className="flex min-w-0 flex-1 items-end gap-2">
            <Select
              className="min-w-0 flex-1"
              value={selectedStatus ?? ALL_FILTER_ID}
              onChange={(value) => {
                if (value === ALL_FILTER_ID || value === null) {
                  setSelectedStatus(undefined);
                  return;
                }

                if (typeof value === 'string') {
                  setSelectedStatus(value as ProjectStatus);
                }
              }}
            >
              <Label>{copy.home.projectsFilters}</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id={ALL_FILTER_ID} textValue={copy.home.all}>
                    {copy.home.all}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  {projectStatuses.map((status) => (
                    <ListBox.Item
                      key={status}
                      id={status}
                      textValue={copy.project.status[status]}
                    >
                      {copy.project.status[status]}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            {selectedStatus ? (
              <Button
                aria-label={copy.home.clearFilters}
                isIconOnly
                type="button"
                size="sm"
                variant="tertiary"
                onPress={() => setSelectedStatus(undefined)}
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>

          <div className="flex items-end gap-2 sm:shrink-0">
            <Select
              className="min-w-0 flex-1 sm:w-72 sm:flex-none"
              value={sort}
              onChange={(value) => {
                if (
                  value === 'relevance' ||
                  value === 'progress-desc' ||
                  value === 'name-asc'
                ) {
                  setSort(value);
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
                  <ListBox.Item id="name-asc" textValue={copy.home.sortName}>
                    {copy.home.sortName}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
            {sort !== 'relevance' ? (
              <Button
                aria-label={copy.home.clearSort}
                isIconOnly
                type="button"
                size="sm"
                variant="tertiary"
                onPress={() => setSort('relevance')}
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {projects.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
        {projects.length === 0 ? (
          <Card variant="secondary">
            <Card.Content className="text-sm text-muted">
              {copy.home.noProjects}
            </Card.Content>
          </Card>
        ) : null}
      </div>
    </section>
  );
}

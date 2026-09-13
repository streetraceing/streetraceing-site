'use client';

import { useLocale } from '@/app/providers';
import { ToolCard } from '@/components/projects/ToolCard';
import { Button } from '@/components/ui/Button';
import type { ToolCategory, ToolConfig } from '@/utils/config';
import { getLocaleTag, getText } from '@/utils/i18n';
import { availableTools, toolCategories } from '@/utils/tool-catalog';
import {
  Card,
  Label,
  ListBox,
  SearchField,
  Select,
  Typography,
} from '@heroui/react';
import Fuse from 'fuse.js';
import { RotateCcw, SearchX, X } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';

type ToolSort = 'relevance' | 'name-asc';
type ToolSearchItem = {
  tool: ToolConfig;
  name: string;
  description: string;
  category: string;
  tags: string[];
};

const ALL_FILTER_ID = 'all';

export function ToolsDirectory() {
  const { copy, locale } = useLocale();
  const strings = copy.toolsPage;
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>();
  const [sort, setSort] = useState<ToolSort>('relevance');
  const collator = useMemo(
    () => new Intl.Collator(getLocaleTag(locale), { sensitivity: 'base' }),
    [locale],
  );

  const search = useMemo(
    () =>
      new Fuse<ToolSearchItem>(
        availableTools.map((tool) => ({
          tool,
          name: getText(tool.name, locale),
          description: getText(tool.description, locale),
          category: strings.categories[tool.category],
          tags: tool.tags.map((tag) => getText(tag, locale)),
        })),
        {
          keys: [
            { name: 'name', weight: 0.5 },
            { name: 'tags', weight: 0.25 },
            { name: 'category', weight: 0.15 },
            { name: 'description', weight: 0.1 },
          ],
          threshold: 0.35,
          ignoreLocation: true,
        },
      ),
    [locale, strings.categories],
  );

  const tools = useMemo(() => {
    const normalizedQuery = deferredQuery.trim();
    const matched = normalizedQuery
      ? search.search(normalizedQuery).map(({ item }) => item.tool)
      : availableTools;
    const filtered = matched.filter(
      (tool) => !selectedCategory || tool.category === selectedCategory,
    );

    return sort === 'name-asc'
      ? [...filtered].sort((firstTool, secondTool) =>
          collator.compare(
            getText(firstTool.name, locale),
            getText(secondTool.name, locale),
          ),
        )
      : filtered;
  }, [collator, deferredQuery, locale, search, selectedCategory, sort]);

  const hasActiveControls = Boolean(
    query.trim() || selectedCategory || sort !== 'relevance',
  );

  function resetControls() {
    setQuery('');
    setSelectedCategory(undefined);
    setSort('relevance');
  }

  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      <section
        className="flex flex-col gap-5"
        aria-labelledby="tools-catalog-heading"
      >
        <div className="flex max-w-2xl flex-col gap-1">
          <Typography.Heading id="tools-catalog-heading" level={2}>
            {strings.catalogTitle}
          </Typography.Heading>
          <Typography.Paragraph className="text-sm text-muted">
            {strings.catalogDescription}
          </Typography.Paragraph>
        </div>

        <Card className="border-0 dark:bg-default/20">
          <Card.Content className="flex flex-col gap-4">
            <SearchField
              value={query}
              onChange={setQuery}
              fullWidth
              variant="secondary"
            >
              <Label className="sr-only">{strings.searchLabel}</Label>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder={strings.searchPlaceholder} />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex min-w-0 flex-1 items-end gap-2">
                <Select
                  className="min-w-0 flex-1"
                  value={selectedCategory ?? ALL_FILTER_ID}
                  variant="secondary"
                  onChange={(value) => {
                    if (value === ALL_FILTER_ID || value === null) {
                      setSelectedCategory(undefined);
                      return;
                    }

                    if (
                      typeof value === 'string' &&
                      toolCategories.includes(value as ToolCategory)
                    ) {
                      setSelectedCategory(value as ToolCategory);
                    }
                  }}
                >
                  <Label>{strings.filters}</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item
                        id={ALL_FILTER_ID}
                        textValue={strings.allCategories}
                      >
                        {strings.allCategories}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                      {toolCategories.map((category) => (
                        <ListBox.Item
                          key={category}
                          id={category}
                          textValue={strings.categories[category]}
                        >
                          {strings.categories[category]}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
                {selectedCategory ? (
                  <Button
                    aria-label={strings.clearFilters}
                    isIconOnly
                    type="button"
                    size="sm"
                    variant="tertiary"
                    onPress={() => setSelectedCategory(undefined)}
                  >
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>

              <div className="flex items-end gap-2 sm:shrink-0">
                <Select
                  className="min-w-0 flex-1 sm:w-72 sm:flex-none"
                  value={sort}
                  variant="secondary"
                  onChange={(value) => {
                    if (value === 'relevance' || value === 'name-asc') {
                      setSort(value);
                    }
                  }}
                >
                  <Label className="sm:sr-only">{strings.sort}</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item
                        id="relevance"
                        textValue={strings.sortRelevance}
                      >
                        {strings.sortRelevance}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                      <ListBox.Item id="name-asc" textValue={strings.sortName}>
                        {strings.sortName}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    </ListBox>
                  </Select.Popover>
                </Select>
                {sort !== 'relevance' ? (
                  <Button
                    aria-label={strings.clearSort}
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

            <div className="flex min-h-8 flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p
                className="text-sm text-muted"
                role="status"
                aria-live="polite"
              >
                {strings.resultCount.replace('{count}', String(tools.length))}
              </p>
              {hasActiveControls ? (
                <Button
                  size="sm"
                  type="button"
                  variant="tertiary"
                  onPress={resetControls}
                >
                  <RotateCcw className="size-4" />
                  {strings.resetAll}
                </Button>
              ) : null}
            </div>
          </Card.Content>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
          {tools.length === 0 ? (
            <Card
              variant="secondary"
              className="border-0 dark:bg-default/20 md:col-span-2 xl:col-span-3"
            >
              <Card.Content className="items-center gap-3 py-10 text-center">
                <span className="grid size-12 place-items-center rounded-2xl bg-default text-muted shadow-sm">
                  <SearchX className="size-5" />
                </span>
                <Typography.Heading level={3}>
                  {strings.noTools}
                </Typography.Heading>
                <Button size="sm" variant="tertiary" onPress={resetControls}>
                  <RotateCcw className="size-4" />
                  {strings.resetAll}
                </Button>
              </Card.Content>
            </Card>
          ) : null}
        </div>
      </section>
    </div>
  );
}

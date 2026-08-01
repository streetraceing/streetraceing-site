'use client';

import { useLocale } from '@/app/providers';
import { ToolCard } from '@/components/projects/ToolCard';
import { Button } from '@/components/ui/Button';
import { mainPageConfig, type ToolConfig } from '@/utils/config';
import { getLocaleTag, getText } from '@/utils/i18n';
import {
  Alert,
  Card,
  Label,
  ListBox,
  SearchField,
  Select,
} from '@heroui/react';
import Fuse from 'fuse.js';
import { X } from 'lucide-react';
import { useMemo, useState } from 'react';

type ToolSort = 'relevance' | 'name-asc';
type ToolSearchItem = {
  tool: ToolConfig;
  name: string;
  description: string;
  tags: string[];
};

const ALL_FILTER_ID = 'all';
const toolTags = mainPageConfig.tools
  .flatMap((tool) => tool.tags)
  .filter(
    (tag, index, tags) =>
      tags.findIndex((candidate) => candidate.ru === tag.ru) === index,
  );

export function ToolsDirectory() {
  const { copy, locale } = useLocale();
  const strings = copy.toolsPage;
  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>();
  const [sort, setSort] = useState<ToolSort>('relevance');

  const search = useMemo(
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

  const tools = useMemo(() => {
    const matched = query.trim()
      ? search.search(query).map(({ item }) => item.tool)
      : mainPageConfig.tools;
    const filtered = matched.filter(
      (tool) => !selectedTag || tool.tags.some((tag) => tag.ru === selectedTag),
    );

    return sort === 'name-asc'
      ? [...filtered].sort((firstTool, secondTool) =>
          getText(firstTool.name, locale).localeCompare(
            getText(secondTool.name, locale),
            getLocaleTag(locale),
          ),
        )
      : filtered;
  }, [locale, query, search, selectedTag, sort]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <SearchField value={query} onChange={setQuery} fullWidth>
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
              value={selectedTag ?? ALL_FILTER_ID}
              onChange={(value) => {
                if (value === ALL_FILTER_ID || value === null) {
                  setSelectedTag(undefined);
                  return;
                }

                if (typeof value === 'string') {
                  setSelectedTag(value);
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
                  <ListBox.Item id={ALL_FILTER_ID} textValue={strings.all}>
                    {strings.all}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  {toolTags.map((tag) => (
                    <ListBox.Item
                      key={tag.ru}
                      id={tag.ru}
                      textValue={getText(tag, locale)}
                    >
                      {getText(tag, locale)}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            {selectedTag ? (
              <Button
                aria-label={strings.clearFilters}
                isIconOnly
                type="button"
                size="sm"
                variant="tertiary"
                onPress={() => setSelectedTag(undefined)}
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
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <ToolCard key={tool.slug} tool={tool} />
        ))}
        {tools.length === 0 ? (
          <Card variant="secondary" className="md:col-span-2 xl:col-span-3">
            <Card.Content className="text-sm text-muted">
              {strings.noTools}
            </Card.Content>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

'use client';

import { Button, ButtonRipple } from '@/components/ui/Button';
import {
  Alert,
  Card,
  Chip,
  Label,
  ListBox,
  Pagination,
  Select,
  Spinner,
  Typography,
} from '@heroui/react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { fromMarkdown } from 'mdast-util-from-markdown';
import dynamic from 'next/dynamic';
import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react';

import { useAuthorSession, useLocale } from '@/app/providers';
import { MediaGallery } from '@/components/media/MediaGallery';
import { HOME_LAYOUT_SETTLED_EVENT } from '@/utils/client-events';
import { formatDateTime } from '@/utils/date';
import { getLocaleTag } from '@/utils/i18n';
import { readJsonResponse } from '@/utils/json';
import { remarkSafeHtml, remarkTextDecorations } from '@/utils/markdown';
import {
  DEV_UPDATES_PAGE_SIZE,
  devUpdateTopics,
  getDevUpdateTopicLabel,
  type DevUpdateSort,
  type DevUpdateTopic,
} from '@/utils/stats';

import { MarkdownContent } from './MarkdownContent';
import {
  isDevUpdatesFeed,
  type DevUpdate,
  type DevUpdateChange,
  type DevUpdatesFeed,
} from './types';

const StatsAuthorControls = dynamic(
  () => import('@/components/stats/StatsAuthorControls'),
);
const DevUpdateAuthorActions = dynamic(
  () => import('./DevUpdateAuthorActions'),
);

const ALL_FILTER_ID = 'all';

function getVisiblePages(currentPage: number, totalPages: number) {
  return [
    ...new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages]),
  ]
    .filter((page) => page > 0 && page <= totalPages)
    .sort((firstPage, secondPage) => firstPage - secondPage);
}

function isLongDevUpdate(content: string) {
  return content.length > 1_200 || content.split(/\r?\n/).length > 16;
}

function getDevUpdateExcerpt(content: string) {
  type ExcerptNode = {
    type: string;
    value?: string;
    alt?: string | null;
    children?: ExcerptNode[];
  };

  const tree: ExcerptNode = fromMarkdown(content);
  remarkSafeHtml()(tree);
  remarkTextDecorations()(tree);

  function collectText(node: ExcerptNode): string {
    if (
      node.type === 'text' ||
      node.type === 'code' ||
      node.type === 'inlineCode'
    ) {
      return node.value ?? '';
    }

    if (node.type === 'image' || node.type === 'imageReference') {
      return node.alt ?? '';
    }

    if (node.type === 'break') {
      return ' ';
    }

    const separator = [
      'root',
      'list',
      'listItem',
      'blockquote',
      'safeHtmlElement',
    ].includes(node.type)
      ? ' '
      : '';
    return (node.children ?? []).map(collectText).join(separator);
  }

  const characters = Array.from(collectText(tree).replace(/\s+/g, ' ').trim());
  return characters.length > 360
    ? `${characters.slice(0, 360).join('').trimEnd()}…`
    : characters.join('');
}

type DevUpdateCardProps = {
  update: DevUpdate;
  isAuthor: boolean;
  onChanged: (change: DevUpdateChange) => void;
};

function DevUpdateCard({ update, isAuthor, onChanged }: DevUpdateCardProps) {
  const { copy, locale } = useLocale();
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = isLongDevUpdate(update.content);
  const isCollapsed = isLong && !isExpanded;
  const contentId = useId();
  const excerpt = useMemo(
    () => (isLong ? getDevUpdateExcerpt(update.content) : ''),
    [isLong, update.content],
  );

  return (
    <Card variant="default" className="dark:bg-default/20">
      <Card.Header className="gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Chip color="accent" size="sm" variant="soft">
              {getDevUpdateTopicLabel(update.topic, locale)}
            </Chip>
            <span className="text-xs text-muted">
              {formatDateTime(update.createdAt, getLocaleTag(locale), 'UTC')}
            </span>
          </div>

          {isAuthor && (
            <DevUpdateAuthorActions update={update} onChanged={onChanged} />
          )}
        </div>
        {update.title && <Card.Title>{update.title}</Card.Title>}
      </Card.Header>
      <Card.Content className="flex flex-col items-start gap-3">
        {update.imageUrls.length > 0 ? (
          <MediaGallery
            urls={update.imageUrls}
            getAlt={(index) =>
              `${update.title ?? copy.stats.updatesTitle}: ${copy.stats.imageAlt} ${index + 1}`
            }
          />
        ) : null}

        <div id={contentId} className="min-w-0 w-full">
          {isCollapsed ? (
            <Typography.Paragraph
              size="sm"
              className="wrap-break-word leading-6"
            >
              {excerpt}
            </Typography.Paragraph>
          ) : (
            <MarkdownContent content={update.content} />
          )}
        </div>

        {isLong && (
          <Button
            size="sm"
            variant="tertiary"
            aria-expanded={isExpanded}
            aria-controls={contentId}
            onPress={() => setIsExpanded((expanded) => !expanded)}
          >
            {isExpanded ? (
              <ChevronUp aria-hidden="true" />
            ) : (
              <ChevronDown aria-hidden="true" />
            )}
            {isExpanded ? copy.stats.showLess : copy.stats.showFull}
          </Button>
        )}
      </Card.Content>
    </Card>
  );
}

export function NewsSection({
  initialFeed,
  initialFeedLoaded,
}: {
  initialFeed: DevUpdatesFeed;
  initialFeedLoaded: boolean;
}) {
  const { copy, locale } = useLocale();
  const { session } = useAuthorSession();
  const strings = copy.stats;
  const [updates, setUpdates] = useState<DevUpdate[]>(initialFeed.updates);
  const [selectedTopic, setSelectedTopic] = useState<DevUpdateTopic>();
  const [selectedSort, setSelectedSort] = useState<DevUpdateSort>('newest');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<DevUpdatesFeed['pagination']>(
    initialFeed.pagination,
  );
  const [feedError, setFeedError] = useState<string>();
  const [isLoading, setIsLoading] = useState(!initialFeedLoaded);
  const [feedRevision, setFeedRevision] = useState(0);
  const feedRequestId = useRef(0);
  const hasSettledInitialHomeLayout = useRef(initialFeedLoaded);
  const shouldSkipInitialRequest = useRef(initialFeedLoaded);

  useEffect(() => {
    if (
      shouldSkipInitialRequest.current &&
      page === 1 &&
      !selectedTopic &&
      selectedSort === 'newest' &&
      feedRevision === 0
    ) {
      shouldSkipInitialRequest.current = false;
      return;
    }

    shouldSkipInitialRequest.current = false;
    const controller = new AbortController();
    const requestId = feedRequestId.current + 1;
    const searchParams = new URLSearchParams({ page: String(page) });

    feedRequestId.current = requestId;

    if (selectedTopic) {
      searchParams.set('topic', selectedTopic);
    }

    searchParams.set('sort', selectedSort);

    if (feedRevision > 0) {
      searchParams.set('refresh', String(feedRevision));
    }

    fetch(`/api/dev-updates?${searchParams}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(strings.errors.updates);
        }

        const body = await readJsonResponse(response);

        if (!isDevUpdatesFeed(body)) {
          throw new Error(strings.errors.updates);
        }

        return body;
      })
      .then((body) => {
        if (requestId === feedRequestId.current) {
          setUpdates(body.updates);
          setPagination(body.pagination);
          setFeedError(undefined);
        }
      })
      .catch((caughtError: unknown) => {
        if (
          caughtError instanceof DOMException &&
          caughtError.name === 'AbortError'
        ) {
          return;
        }

        if (requestId === feedRequestId.current) {
          setFeedError(
            caughtError instanceof Error
              ? caughtError.message
              : strings.errors.updates,
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted && requestId === feedRequestId.current) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [feedRevision, page, selectedSort, selectedTopic, strings.errors.updates]);

  const visiblePages = useMemo(
    () =>
      pagination ? getVisiblePages(pagination.page, pagination.totalPages) : [],
    [pagination],
  );

  function selectTopic(topic: DevUpdateTopic | undefined) {
    const nextTopic = selectedTopic === topic ? undefined : topic;

    if (selectedTopic === nextTopic && page === 1) {
      return;
    }

    setIsLoading(true);
    setFeedError(undefined);
    setSelectedTopic(nextTopic);
    setPage(1);
  }

  function selectPage(nextPage: number) {
    if (nextPage === page || nextPage < 1) {
      return;
    }

    setIsLoading(true);
    setFeedError(undefined);
    setPage(nextPage);
  }

  function selectSort(sort: DevUpdateSort) {
    if (sort === selectedSort && page === 1) {
      return;
    }

    setIsLoading(true);
    setFeedError(undefined);
    setSelectedSort(sort);
    setPage(1);
  }

  function refreshFeed(change: DevUpdateChange = 'update') {
    setIsLoading(true);
    setFeedError(undefined);

    if (change === 'delete' && updates.length === 1 && page > 1) {
      setPage((currentPage) => currentPage - 1);
      return;
    }

    setFeedRevision((revision) => revision + 1);
  }

  useEffect(() => {
    if (isLoading || hasSettledInitialHomeLayout.current) {
      return;
    }

    hasSettledInitialHomeLayout.current = true;
    window.dispatchEvent(new Event(HOME_LAYOUT_SETTLED_EVENT));
  }, [isLoading]);

  return (
    <section
      id="news"
      className="scroll-mt-16 flex flex-col gap-3 border-t pt-4"
      aria-labelledby="updates-heading"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Typography.Heading id="updates-heading" level={2}>
            {strings.updatesTitle}
          </Typography.Heading>
          <Typography.Paragraph className="text-muted">
            {strings.updatesDescription}
          </Typography.Paragraph>
        </div>
        {pagination && (
          <Chip size="sm" variant="secondary" className="px-2 max-w-fit">
            {strings.total.replace('{count}', String(pagination.total))}
          </Chip>
        )}
      </div>

      {session?.authenticated && (
        <StatsAuthorControls
          onCreated={(update) => {
            const belongsToCurrentFilter =
              !selectedTopic || selectedTopic === update.topic;

            if (!belongsToCurrentFilter) {
              return;
            }

            feedRequestId.current += 1;
            setIsLoading(true);

            if (page === 1 && selectedSort === 'newest') {
              setUpdates((currentUpdates) =>
                [
                  update,
                  ...currentUpdates.filter(
                    (currentUpdate) => currentUpdate.id !== update.id,
                  ),
                ].slice(0, DEV_UPDATES_PAGE_SIZE),
              );
            }

            setPagination((currentPagination) =>
              currentPagination
                ? {
                    ...currentPagination,
                    total: currentPagination.total + 1,
                    totalPages: Math.max(
                      1,
                      Math.ceil(
                        (currentPagination.total + 1) / DEV_UPDATES_PAGE_SIZE,
                      ),
                    ),
                  }
                : currentPagination,
            );
            setFeedRevision((revision) => revision + 1);
          }}
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-1 items-end gap-2">
          <Select
            className="min-w-0 flex-1"
            value={selectedTopic ?? ALL_FILTER_ID}
            onChange={(value) => {
              if (value === ALL_FILTER_ID || value === null) {
                selectTopic(undefined);
                return;
              }

              if (typeof value === 'string') {
                selectTopic(value as DevUpdateTopic);
              }
            }}
          >
            <Label>{strings.updatesFilter}</Label>
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
                {devUpdateTopics.map((topic) => (
                  <ListBox.Item
                    key={topic.value}
                    id={topic.value}
                    textValue={getDevUpdateTopicLabel(topic.value, locale)}
                  >
                    {getDevUpdateTopicLabel(topic.value, locale)}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          {selectedTopic && (
            <Button
              aria-label={strings.clearFilters}
              isIconOnly
              size="sm"
              variant="tertiary"
              onPress={() => selectTopic(undefined)}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>

        <div className="flex items-end gap-2 sm:shrink-0">
          <Select
            className="min-w-0 flex-1 sm:w-72 sm:flex-none"
            value={selectedSort}
            onChange={(value) => {
              if (value === 'newest' || value === 'oldest') {
                selectSort(value);
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
                <ListBox.Item id="newest" textValue={strings.sortNewest}>
                  {strings.sortNewest}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="oldest" textValue={strings.sortOldest}>
                  {strings.sortOldest}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>
          {selectedSort !== 'newest' && (
            <Button
              aria-label={strings.clearSort}
              isIconOnly
              size="sm"
              variant="tertiary"
              onPress={() => selectSort('newest')}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {feedError && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{strings.updatesLoadFailed}</Alert.Title>
            <Alert.Description>{feedError}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {isLoading && updates.length === 0 && (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      )}

      {!isLoading && !feedError && updates.length === 0 && (
        <Card variant="transparent">
          <Card.Content className="text-sm text-muted">
            {strings.noUpdates}
          </Card.Content>
        </Card>
      )}

      {updates.length > 0 && (
        <div className="flex flex-col gap-3">
          {updates.map((update) => (
            <DevUpdateCard
              key={update.id}
              update={update}
              isAuthor={session?.authenticated ?? false}
              onChanged={refreshFeed}
            />
          ))}
        </div>
      )}

      {updates.length > 0 ? (
        <div
          aria-live="polite"
          className="flex min-h-5 items-center gap-2 text-sm text-muted"
        >
          {isLoading ? (
            <>
              <Spinner size="sm" />
              {strings.refreshing}
            </>
          ) : null}
        </div>
      ) : null}

      {pagination && pagination.totalPages > 1 && (
        <Pagination
          size="sm"
          aria-label={strings.updatesTitle}
          className="w-full flex-wrap"
        >
          <Pagination.Summary className="hidden sm:block">
            {strings.page
              .replace('{page}', String(pagination.page))
              .replace('{total}', String(pagination.totalPages))}
          </Pagination.Summary>
          <Pagination.Content className="w-full justify-between sm:w-auto sm:justify-start">
            <Pagination.Item>
              <Pagination.Previous
                aria-label={strings.previous}
                isDisabled={pagination.page === 1}
                onPress={() => selectPage(pagination.page - 1)}
              >
                <ButtonRipple disabled={pagination.page === 1} />
                <Pagination.PreviousIcon />
                <span className="hidden sm:inline">{strings.previous}</span>
              </Pagination.Previous>
            </Pagination.Item>
            <Pagination.Item className="min-w-0 sm:hidden">
              <span
                role="status"
                className="text-sm tabular-nums"
                aria-label={strings.page
                  .replace('{page}', String(pagination.page))
                  .replace('{total}', String(pagination.totalPages))}
              >
                {pagination.page} / {pagination.totalPages}
              </span>
            </Pagination.Item>
            {visiblePages.map((visiblePage, index) => (
              <Fragment key={visiblePage}>
                {index > 0 && visiblePage - visiblePages[index - 1] > 1 && (
                  <Pagination.Item className="hidden sm:flex">
                    <Pagination.Ellipsis />
                  </Pagination.Item>
                )}
                <Pagination.Item className="hidden sm:flex">
                  <Pagination.Link
                    isActive={pagination.page === visiblePage}
                    onPress={() => selectPage(visiblePage)}
                  >
                    <ButtonRipple />
                    {visiblePage}
                  </Pagination.Link>
                </Pagination.Item>
              </Fragment>
            ))}
            <Pagination.Item>
              <Pagination.Next
                aria-label={strings.next}
                isDisabled={pagination.page === pagination.totalPages}
                onPress={() => selectPage(pagination.page + 1)}
              >
                <ButtonRipple
                  disabled={pagination.page === pagination.totalPages}
                />
                <span className="hidden sm:inline">{strings.next}</span>
                <Pagination.NextIcon />
              </Pagination.Next>
            </Pagination.Item>
          </Pagination.Content>
        </Pagination>
      )}
    </section>
  );
}

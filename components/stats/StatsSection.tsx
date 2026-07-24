/* eslint-disable @next/next/no-img-element -- Remote media images are already compressed and served directly without invoking Vercel Image Optimization. */
'use client';

import {
  Alert,
  Button,
  Card,
  Chip,
  Label,
  ListBox,
  Pagination,
  ProgressBar,
  Select,
  Spinner,
  Typography,
} from '@heroui/react';
import { ChevronDown, X } from 'lucide-react';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';

import { useAuthorSession, useLocale } from '@/app/providers';
import StatsAuthorControls from '@/components/stats/StatsAuthorControls';
import { HOME_LAYOUT_SETTLED_EVENT } from '@/utils/client-events';
import { getLocaleTag, getText } from '@/utils/i18n';
import {
  DEV_UPDATES_PAGE_SIZE,
  developmentDirections,
  devUpdateTopics,
  getDevUpdateTopicLabel,
  type DevUpdateSort,
  type DevUpdateTopic,
} from '@/utils/stats';

import DevUpdateAuthorActions from './DevUpdateAuthorActions';
import { MarkdownContent } from './MarkdownContent';
import type { DevUpdate, DevUpdateChange, DevUpdatesFeed } from './types';

const ALL_FILTER_ID = 'all';

function formatDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(date));
}

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

  return (
    <Card variant="default">
      <Card.Header className="gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Chip color="accent" size="sm" variant="soft">
              {getDevUpdateTopicLabel(update.topic, locale)}
            </Chip>
            <span className="text-xs text-muted">
              {formatDate(update.createdAt, getLocaleTag(locale))}
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
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            {update.imageUrls.map((url, index) => (
              <figure
                key={url}
                className="aspect-video overflow-hidden rounded-xl border bg-default-soft"
              >
                <img
                  src={url}
                  alt={`${update.title ?? copy.stats.updatesTitle}: ${copy.stats.imageAlt} ${index + 1}`}
                  className="size-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            ))}
          </div>
        ) : null}

        <div
          className={
            isCollapsed ? 'relative max-h-80 w-full overflow-hidden' : 'w-full'
          }
        >
          <MarkdownContent content={update.content} />
          {isCollapsed && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-surface-tertiary to-transparent"
            />
          )}
        </div>

        {isCollapsed && (
          <Button
            size="sm"
            variant="tertiary"
            onPress={() => setIsExpanded(true)}
          >
            <ChevronDown />
            {copy.stats.showFull}
          </Button>
        )}
      </Card.Content>
    </Card>
  );
}

export function StatsSection({
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

        return (await response.json()) as DevUpdatesFeed;
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
      id="stats"
      className="scroll-mt-16 flex flex-col gap-4 border-t pt-4"
    >
      <div className="flex flex-col gap-1">
        <Typography.Heading level={2}>{strings.title}</Typography.Heading>
        <Typography.Paragraph className="text-muted">
          {strings.description}
        </Typography.Paragraph>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {developmentDirections.map((direction) => (
          <Card key={direction.id}>
            <Card.Header className="flex-row items-center justify-between gap-3">
              <Card.Title className="text-lg font-semibold">
                {getText(direction.label, locale)}
              </Card.Title>
              <Chip
                color={direction.color}
                size="sm"
                variant="soft"
                className="px-2"
              >
                {direction.value}%
              </Chip>
            </Card.Header>
            <Card.Content>
              <ProgressBar
                value={direction.value}
                color={direction.color}
                size="sm"
                valueLabel={`${direction.value}%`}
                aria-label={`${getText(direction.label, locale)}: ${direction.value}%`}
              >
                <ProgressBar.Track>
                  <ProgressBar.Fill />
                </ProgressBar.Track>
              </ProgressBar>
            </Card.Content>
          </Card>
        ))}
      </div>

      <section
        className="flex flex-col gap-3 border-t pt-4"
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
          <Pagination size="sm">
            <Pagination.Summary>
              {strings.page
                .replace('{page}', String(pagination.page))
                .replace('{total}', String(pagination.totalPages))}
            </Pagination.Summary>
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous
                  isDisabled={pagination.page === 1}
                  onPress={() => selectPage(pagination.page - 1)}
                >
                  <Pagination.PreviousIcon />
                  <span>{strings.previous}</span>
                </Pagination.Previous>
              </Pagination.Item>
              {visiblePages.map((visiblePage, index) => (
                <Fragment key={visiblePage}>
                  {index > 0 && visiblePage - visiblePages[index - 1] > 1 && (
                    <Pagination.Item>
                      <Pagination.Ellipsis />
                    </Pagination.Item>
                  )}
                  <Pagination.Item>
                    <Pagination.Link
                      isActive={pagination.page === visiblePage}
                      onPress={() => selectPage(visiblePage)}
                    >
                      {visiblePage}
                    </Pagination.Link>
                  </Pagination.Item>
                </Fragment>
              ))}
              <Pagination.Item>
                <Pagination.Next
                  isDisabled={pagination.page === pagination.totalPages}
                  onPress={() => selectPage(pagination.page + 1)}
                >
                  <span>{strings.next}</span>
                  <Pagination.NextIcon />
                </Pagination.Next>
              </Pagination.Item>
            </Pagination.Content>
          </Pagination>
        )}
      </section>
    </section>
  );
}

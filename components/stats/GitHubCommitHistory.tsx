'use client';

import { useLocale } from '@/app/providers';
import type { PublicGitHubCommitFeed } from '@/components/stats/types';
import { GITHUB_PROFILE_URL } from '@/utils/github';
import { getLocaleTag } from '@/utils/i18n';
import { Card, Chip, Separator } from '@heroui/react';
import { ArrowUpRight, GitCommitHorizontal } from 'lucide-react';
import NextLink from 'next/link';
import { FaGithub } from 'react-icons/fa6';

function formatCommitDate(value: string, locale: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function GitHubCommitHistory({
  feed,
}: {
  feed: PublicGitHubCommitFeed;
}) {
  const { copy, locale } = useLocale();
  const strings = copy.stats;

  return (
    <Card
      variant="default"
      className="min-w-0 dark:bg-default/20"
      aria-labelledby="github-history-heading"
    >
      <Card.Header className="gap-3 sm:flex-row sm:items-start sm:justify-between border-b pb-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-secondary"
            aria-hidden="true"
          >
            <FaGithub className="size-5" />
          </span>
          <div className="min-w-0">
            <Card.Title id="github-history-heading">
              {strings.githubHistoryTitle}
            </Card.Title>
            <Card.Description>
              {strings.githubHistoryDescription}
            </Card.Description>
          </div>
        </div>

        <NextLink
          href={GITHUB_PROFILE_URL}
          target="_blank"
          rel="noreferrer"
          prefetch={false}
          className="link inline-flex shrink-0 items-center gap-1 self-start text-sm"
        >
          {strings.githubViewProfile}
          <ArrowUpRight className="size-4" />
        </NextLink>
      </Card.Header>

      <Card.Content className="min-w-0 overflow-hidden">
        {feed.commits.length > 0 ? (
          <ol className="md:max-h-96 max-h-60 min-w-0 overflow-y-auto overflow-x-hidden pr-1">
            {feed.commits.map((commit, index) => (
              <li key={`${commit.repository}:${commit.sha}`}>
                <NextLink
                  href={commit.url}
                  target="_blank"
                  rel="noreferrer"
                  prefetch={false}
                  className="group flex w-full min-w-0 items-start gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span
                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-secondary text-accent transition-colors group-hover:bg-accent/10"
                    aria-hidden="true"
                  >
                    <GitCommitHorizontal className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 wrap-break-word text-sm font-medium transition-colors">
                      {commit.message}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <Chip size="sm" variant="soft" className="max-w-full">
                        {commit.repository.replace('streetraceing/', '')}
                      </Chip>
                      <code className="break-all">
                        {commit.sha.slice(0, 7)}
                      </code>
                      <time dateTime={commit.committedAt}>
                        {formatCommitDate(
                          commit.committedAt,
                          getLocaleTag(locale),
                        )}
                      </time>
                    </span>
                  </span>
                  <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted transition-colors group-hover:text-accent" />
                </NextLink>
                {index < feed.commits.length - 1 ? (
                  <Separator className="ml-11" />
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
            {feed.available
              ? strings.githubHistoryEmpty
              : strings.githubHistoryUnavailable}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}

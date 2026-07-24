'use client';

import { useLocale } from '@/app/providers';
import type { PublicGitHubCommitFeed } from '@/components/stats/types';
import { GITHUB_PROFILE_URL } from '@/utils/github';
import { getLocaleTag } from '@/utils/i18n';
import { Chip, Typography } from '@heroui/react';
import { ArrowUpRight, GitCommitHorizontal } from 'lucide-react';
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
    <section
      className="cosmic-panel flex flex-col gap-4 p-4 sm:p-5"
      aria-labelledby="github-history-heading"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="github-history-logo" aria-hidden="true">
            <FaGithub className="size-5" />
          </span>
          <div className="min-w-0">
            <Typography.Heading id="github-history-heading" level={3}>
              {strings.githubHistoryTitle}
            </Typography.Heading>
            <Typography.Paragraph className="text-sm text-muted">
              {strings.githubHistoryDescription}
            </Typography.Paragraph>
          </div>
        </div>

        <a
          href={GITHUB_PROFILE_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-accent underline-offset-4 hover:underline"
        >
          {strings.githubViewProfile}
          <ArrowUpRight className="size-4" />
        </a>
      </div>

      {feed.commits.length > 0 ? (
        <ol className="github-history-list">
          {feed.commits.map((commit) => (
            <li key={`${commit.repository}:${commit.sha}`}>
              <a
                href={commit.url}
                target="_blank"
                rel="noreferrer"
                className="github-commit-row group"
              >
                <span className="github-commit-node" aria-hidden="true">
                  <GitCommitHorizontal className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm font-medium transition-colors group-hover:text-accent">
                    {commit.message}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <Chip size="sm" variant="soft" className="max-w-full">
                      {commit.repository.replace('streetraceing/', '')}
                    </Chip>
                    <code>{commit.sha.slice(0, 7)}</code>
                    <time dateTime={commit.committedAt}>
                      {formatCommitDate(
                        commit.committedAt,
                        getLocaleTag(locale),
                      )}
                    </time>
                  </span>
                </span>
                <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
              </a>
            </li>
          ))}
        </ol>
      ) : (
        <div className="rounded-xl border border-dashed p-4 text-sm text-muted">
          {feed.available
            ? strings.githubHistoryEmpty
            : strings.githubHistoryUnavailable}
        </div>
      )}
    </section>
  );
}

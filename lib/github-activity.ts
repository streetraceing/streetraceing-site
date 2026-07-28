import type {
  PublicGitHubCommit,
  PublicGitHubCommitFeed,
} from '@/components/stats/types';
import {
  GITHUB_ACTIVITY_REVALIDATE_SECONDS,
  GITHUB_USERNAME,
} from '@/utils/github';

const DEFAULT_COMMIT_LIMIT = 16;

type GitHubCommitSearchItem = {
  sha?: unknown;
  html_url?: unknown;
  commit?: {
    message?: unknown;
    author?: { date?: unknown } | null;
    committer?: { date?: unknown } | null;
  } | null;
  repository?: {
    full_name?: unknown;
    html_url?: unknown;
    owner?: { login?: unknown } | null;
    private?: unknown;
  } | null;
};

type GitHubCommitSearchResponse = {
  items?: unknown;
};

function asNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isGitHubWebUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === 'https:' && url.hostname === 'github.com';
  } catch {
    return false;
  }
}

function parseCommit(
  item: GitHubCommitSearchItem,
): PublicGitHubCommit | undefined {
  const sha = asNonEmptyString(item.sha);
  const url = asNonEmptyString(item.html_url);
  const repository = asNonEmptyString(item.repository?.full_name);
  const repositoryUrl = asNonEmptyString(item.repository?.html_url);
  const message = asNonEmptyString(item.commit?.message)?.split(/\r?\n/, 1)[0];
  const committedAt =
    asNonEmptyString(item.commit?.author?.date) ??
    asNonEmptyString(item.commit?.committer?.date);
  const owner = asNonEmptyString(item.repository?.owner?.login);

  if (
    !sha ||
    !url ||
    !repository ||
    !repositoryUrl ||
    !message ||
    !committedAt ||
    owner?.toLowerCase() !== GITHUB_USERNAME ||
    item.repository?.private !== false ||
    !isGitHubWebUrl(url) ||
    !isGitHubWebUrl(repositoryUrl) ||
    Number.isNaN(Date.parse(committedAt))
  ) {
    return undefined;
  }

  return { sha, message, url, repository, repositoryUrl, committedAt };
}

export async function readPublicGitHubCommits(
  limit = DEFAULT_COMMIT_LIMIT,
): Promise<PublicGitHubCommitFeed> {
  const searchParams = new URLSearchParams({
    q: `author:${GITHUB_USERNAME} user:${GITHUB_USERNAME}`,
    sort: 'author-date',
    order: 'desc',
    per_page: String(Math.min(50, Math.max(1, limit))),
  });
  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'streetraceing-site',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(
      `https://api.github.com/search/commits?${searchParams}`,
      {
        headers,
        signal: AbortSignal.timeout(4_500),
        next: {
          revalidate: GITHUB_ACTIVITY_REVALIDATE_SECONDS,
          tags: ['github-activity'],
        },
      },
    );

    if (!response.ok) {
      return { commits: [], available: false };
    }

    const body = (await response.json()) as GitHubCommitSearchResponse;
    const items = Array.isArray(body.items)
      ? (body.items as GitHubCommitSearchItem[])
      : [];
    const commits = items
      .map(parseCommit)
      .filter((commit): commit is PublicGitHubCommit => Boolean(commit))
      .slice(0, limit);

    return { commits, available: true };
  } catch {
    return { commits: [], available: false };
  }
}

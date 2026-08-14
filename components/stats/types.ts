import { isJsonObject } from '@/utils/json';
import { isDevUpdateTopic, type DevUpdateTopic } from '@/utils/stats';

export type DevUpdate = {
  id: string;
  title: string | null;
  content: string;
  topic: DevUpdateTopic;
  imageUrls: string[];
  createdAt: string;
};

export type DevUpdatesFeed = {
  updates: DevUpdate[];
  pagination: {
    page: number;
    total: number;
    totalPages: number;
  };
};

export type DevUpdateChange = 'delete' | 'update';

export type PublicGitHubCommit = {
  sha: string;
  message: string;
  url: string;
  repository: string;
  repositoryUrl: string;
  committedAt: string;
};

export type PublicGitHubCommitFeed = {
  commits: PublicGitHubCommit[];
  available: boolean;
};

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function isDevUpdate(value: unknown): value is DevUpdate {
  return (
    isJsonObject(value) &&
    typeof value.id === 'string' &&
    (value.title === null || typeof value.title === 'string') &&
    typeof value.content === 'string' &&
    typeof value.topic === 'string' &&
    isDevUpdateTopic(value.topic) &&
    Array.isArray(value.imageUrls) &&
    value.imageUrls.every((url: unknown) => typeof url === 'string') &&
    typeof value.createdAt === 'string'
  );
}

export function isDevUpdatesFeed(value: unknown): value is DevUpdatesFeed {
  if (
    !isJsonObject(value) ||
    !Array.isArray(value.updates) ||
    !value.updates.every(isDevUpdate) ||
    !isJsonObject(value.pagination)
  ) {
    return false;
  }

  return (
    isNonNegativeSafeInteger(value.pagination.page) &&
    value.pagination.page >= 1 &&
    isNonNegativeSafeInteger(value.pagination.total) &&
    isNonNegativeSafeInteger(value.pagination.totalPages) &&
    value.pagination.totalPages >= 1
  );
}

function isPublicGitHubCommit(value: unknown): value is PublicGitHubCommit {
  return (
    isJsonObject(value) &&
    typeof value.sha === 'string' &&
    /^[0-9a-f]{7,64}$/i.test(value.sha) &&
    typeof value.message === 'string' &&
    isGitHubWebUrl(value.url) &&
    typeof value.repository === 'string' &&
    isGitHubWebUrl(value.repositoryUrl) &&
    typeof value.committedAt === 'string' &&
    !Number.isNaN(Date.parse(value.committedAt))
  );
}

function isGitHubWebUrl(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'github.com';
  } catch {
    return false;
  }
}

export function isPublicGitHubCommitFeed(
  value: unknown,
): value is PublicGitHubCommitFeed {
  return (
    isJsonObject(value) &&
    typeof value.available === 'boolean' &&
    Array.isArray(value.commits) &&
    value.commits.every(isPublicGitHubCommit)
  );
}

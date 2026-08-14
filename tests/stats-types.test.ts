import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isDevUpdate,
  isDevUpdatesFeed,
  isPublicGitHubCommitFeed,
} from '../components/stats/types';

const update = {
  id: '90ef1d10-85dc-4b78-9b2e-2fce2dd70857',
  title: null,
  content: 'Stable update',
  topic: 'site',
  imageUrls: [],
  createdAt: '2026-08-14T12:00:00.000Z',
};

test('validates Dev Note API payloads before rendering them', () => {
  assert.equal(isDevUpdate(update), true);
  assert.equal(
    isDevUpdatesFeed({
      updates: [update],
      pagination: { page: 1, total: 1, totalPages: 1 },
    }),
    true,
  );
  assert.equal(
    isDevUpdatesFeed({
      updates: [{ ...update, topic: 'unknown' }],
      pagination: { page: 1, total: 1, totalPages: 1 },
    }),
    false,
  );
});

test('validates every public GitHub commit in a feed', () => {
  assert.equal(
    isPublicGitHubCommitFeed({
      available: true,
      commits: [
        {
          sha: 'abc1234',
          message: 'feat: improve site',
          url: 'https://github.com/streetraceing/example/commit/abc1234',
          repository: 'streetraceing/example',
          repositoryUrl: 'https://github.com/streetraceing/example',
          committedAt: '2026-08-14T12:00:00.000Z',
        },
      ],
    }),
    true,
  );
  assert.equal(
    isPublicGitHubCommitFeed({ available: true, commits: [{}] }),
    false,
  );
});

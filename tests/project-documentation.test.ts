import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getProjectDocumentationBreadcrumbs,
  resolveProjectDocumentationUrl,
} from '../lib/project-documentation';

const root =
  'https://raw.githubusercontent.com/streetraceing/package/refs/heads/main/docs/README.md';

test('resolves relative Markdown files inside the configured repository branch', () => {
  assert.equal(
    resolveProjectDocumentationUrl(root, '../AGENTS.md'),
    'https://raw.githubusercontent.com/streetraceing/package/refs/heads/main/AGENTS.md',
  );
});

test('normalizes GitHub blob links to raw Markdown in the same repository', () => {
  assert.equal(
    resolveProjectDocumentationUrl(
      root,
      'https://github.com/streetraceing/package/blob/main/docs/PACKAGESHIFT.md',
    ),
    'https://raw.githubusercontent.com/streetraceing/package/refs/heads/main/docs/PACKAGESHIFT.md',
  );
});

test('rejects non-Markdown files and links outside the configured repository', () => {
  assert.equal(
    resolveProjectDocumentationUrl(
      root,
      'https://raw.githubusercontent.com/another/project/refs/heads/main/README.md',
    ),
    undefined,
  );
  assert.equal(resolveProjectDocumentationUrl(root, './image.png'), undefined);
});

test('builds README targets for repository and directory breadcrumbs', () => {
  assert.deepEqual(
    getProjectDocumentationBreadcrumbs(
      'https://raw.githubusercontent.com/streetraceing/luminous/refs/heads/main/docs/customization.md',
    ),
    [
      {
        label: 'luminous',
        targetUrl:
          'https://raw.githubusercontent.com/streetraceing/luminous/refs/heads/main/README.md',
      },
      {
        label: 'docs',
        targetUrl:
          'https://raw.githubusercontent.com/streetraceing/luminous/refs/heads/main/docs/README.md',
      },
      { label: 'customization.md' },
    ],
  );
});

test('builds matching README targets for GitHub Pages documentation', () => {
  assert.deepEqual(
    getProjectDocumentationBreadcrumbs(
      'https://streetraceing.github.io/luminous/docs/customization.md',
    ),
    [
      {
        label: 'luminous',
        targetUrl: 'https://streetraceing.github.io/luminous/README.md',
      },
      {
        label: 'docs',
        targetUrl: 'https://streetraceing.github.io/luminous/docs/README.md',
      },
      { label: 'customization.md' },
    ],
  );
});

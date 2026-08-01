import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveProjectDocumentationUrl } from '../lib/project-documentation';

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

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getDocumentationFragment,
  getDocumentationPath,
  isDocumentationLinkInScope,
  resolveDocumentationPath,
  resolveScopedDocumentationUrl,
} from '../utils/project-documentation-scope';

const root =
  'https://raw.githubusercontent.com/streetraceing/package/refs/heads/main/docs/README.md';
const scope =
  'https://raw.githubusercontent.com/streetraceing/package/refs/heads/main/';

test('client navigation stays within the configured repository and branch', () => {
  assert.equal(
    resolveScopedDocumentationUrl(root, '../GUIDE.md#setup'),
    `${scope}GUIDE.md#setup`,
  );
  assert.equal(isDocumentationLinkInScope(root, '#setup'), true);
  for (const target of [
    'https://example.com/README.md',
    'https://raw.githubusercontent.com/another/package/refs/heads/main/README.md',
    'https://raw.githubusercontent.com/streetraceing/other/refs/heads/main/README.md',
    'https://raw.githubusercontent.com/streetraceing/package/refs/heads/main-other/README.md',
    'https://raw.githubusercontent.com/streetraceing/package/refs/heads/dev/README.md',
    'https://raw.githubusercontent.com/streetraceing/package/refs/tags/main/README.md',
    '../../dev/README.md',
    './image.png',
    'javascript:alert(1)',
    'http://raw.githubusercontent.com/streetraceing/package/refs/heads/main/README.md',
    `${scope}bad%2fpath.md`,
    `${scope}bad%5cpath.md`,
    `${scope}bad%zz.md`,
    'https://user@raw.githubusercontent.com/streetraceing/package/refs/heads/main/README.md',
  ]) {
    assert.equal(isDocumentationLinkInScope(root, target), false, target);
  }
});

test('same-scope GitHub blob links retain their fragment when normalized', () => {
  assert.equal(
    resolveScopedDocumentationUrl(
      root,
      'https://github.com/streetraceing/package/blob/main/docs/guide.md?plain=1#install',
    ),
    `${scope}docs/guide.md#install`,
  );
  assert.equal(
    isDocumentationLinkInScope(
      root,
      'https://github.com/streetraceing/other/blob/main/README.md',
    ),
    false,
  );
});

test('short raw references and non-GitHub directory roots stay bounded', () => {
  const shortRoot =
    'https://raw.githubusercontent.com/streetraceing/package/main/README.md';
  assert.equal(isDocumentationLinkInScope(shortRoot, './docs/guide.MD'), true);
  assert.equal(
    isDocumentationLinkInScope(shortRoot, '../dev/README.md'),
    false,
  );
  const hostedRoot = 'https://docs.example.com/project/docs/README.md';
  assert.equal(
    isDocumentationLinkInScope(hostedRoot, './nested/guide.md'),
    true,
  );
  assert.equal(isDocumentationLinkInScope(hostedRoot, '../README.md'), false);
  assert.equal(
    isDocumentationLinkInScope(hostedRoot, '/project/docs-other/README.md'),
    false,
  );
  assert.equal(
    isDocumentationLinkInScope(
      hostedRoot,
      'https://docs.example.com:444/project/docs/guide.md',
    ),
    false,
  );
  assert.equal(isDocumentationLinkInScope('not a URL', './guide.md'), false);
});

test('secondary document paths round-trip through a safe query parameter', () => {
  const target = `${scope}docs/usage%20notes.md#install`;
  const path = getDocumentationPath(root, target);
  assert.equal(path, 'docs/usage%20notes.md');
  assert.ok(path);
  const query = new URLSearchParams({ doc: path });
  const restoredPath = new URLSearchParams(query.toString()).get('doc');
  assert.ok(restoredPath);
  assert.equal(
    resolveDocumentationPath(root, restoredPath),
    `${scope}docs/usage%20notes.md`,
  );
  assert.equal(
    resolveDocumentationPath(root, '.github/README.md'),
    `${scope}.github/README.md`,
  );
  assert.equal(
    getDocumentationPath(root, 'https://example.com/README.md'),
    undefined,
  );
  for (const invalid of [
    '',
    '/README.md',
    '../README.md',
    '//example.com/README.md',
    'https://example.com/README.md',
    'docs/../README.md',
    'docs\\README.md',
    'docs/README.md?url=other',
    'docs/README.md#heading',
    'docs/%2fREADME.md',
  ]) {
    assert.equal(resolveDocumentationPath(root, invalid), undefined, invalid);
  }
});

test('incoming rendered fragments are not prefixed twice on reload', () => {
  assert.equal(
    getDocumentationFragment(
      '#project-documentation-install',
      'project-documentation',
    ),
    '#install',
  );
  assert.equal(
    getDocumentationFragment('#install', 'project-documentation'),
    '#install',
  );
  assert.equal(
    getDocumentationFragment(
      '#project-documentation-%D1%82%D0%B5%D1%81%D1%82',
      'project-documentation',
    ),
    '#%D1%82%D0%B5%D1%81%D1%82',
  );
  assert.equal(getDocumentationFragment('', 'project-documentation'), '');
});

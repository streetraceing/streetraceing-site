import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isExternalHttpHref,
  normalizeInternalAnchorHref,
} from '../utils/links';

test('root-qualifies internal section anchors', () => {
  assert.equal(normalizeInternalAnchorHref('#projects'), '/#projects');
  assert.equal(normalizeInternalAnchorHref('/#tools'), '/#tools');
  assert.equal(
    normalizeInternalAnchorHref('/project/farsight'),
    '/project/farsight',
  );
});

test('recognizes only HTTP links as external', () => {
  assert.equal(isExternalHttpHref('https://example.com'), true);
  assert.equal(isExternalHttpHref('http://example.com'), true);
  assert.equal(isExternalHttpHref('/#projects'), false);
});

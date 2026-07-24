import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CODE_PATTERN,
  createOwnerToken,
  createShortCode,
  createTinyUrlPreview,
  getTinyUrlExpirationDate,
  isTinyUrlExpired,
  OWNER_TOKEN_PATTERN,
  TINY_URL_RETENTION_DAYS,
} from '../lib/tiny-url';

test('generated identifiers match their public formats', () => {
  assert.match(createShortCode(), CODE_PATTERN);
  assert.match(createOwnerToken(), OWNER_TOKEN_PATTERN);
});

test('previews normalize whitespace and are bounded', () => {
  const preview = createTinyUrlPreview(`  ${'word '.repeat(100)}  `);

  assert.equal(preview.includes('\n'), false);
  assert.equal(preview.endsWith('…'), true);
  assert.equal(preview.length, 161);
});

test('expiration is based on the retention period', () => {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  const expiration = getTinyUrlExpirationDate(createdAt);
  const expected = new Date(createdAt);
  expected.setUTCDate(expected.getUTCDate() + TINY_URL_RETENTION_DAYS);

  assert.equal(expiration.toISOString(), expected.toISOString());
  assert.equal(isTinyUrlExpired(createdAt, expiration), true);
});

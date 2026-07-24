import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import { checkRateLimit, resetRateLimit } from '../utils/rate-limit';

test('checkRateLimit rejects requests after the configured limit', () => {
  const key = `test:${randomUUID()}`;
  const options = { key, limit: 2, windowMs: 1_000, now: 1_000 };

  assert.equal(checkRateLimit(options).allowed, true);
  assert.equal(checkRateLimit(options).allowed, true);
  assert.equal(checkRateLimit(options).allowed, false);

  resetRateLimit(key);
});

test('checkRateLimit starts a new window after expiration', () => {
  const key = `test:${randomUUID()}`;

  checkRateLimit({ key, limit: 1, windowMs: 1_000, now: 1_000 });
  const result = checkRateLimit({
    key,
    limit: 1,
    windowMs: 1_000,
    now: 2_001,
  });

  assert.equal(result.allowed, true);
  assert.equal(result.remaining, 0);

  resetRateLimit(key);
});

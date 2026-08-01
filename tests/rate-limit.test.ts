import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import {
  checkRateLimit,
  getClientAddress,
  resetRateLimit,
} from '../utils/rate-limit';

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

test('getClientAddress only trusts explicitly configured proxy headers', () => {
  const previousVercel = process.env.VERCEL;
  const previousHeader = process.env.TRUSTED_PROXY_IP_HEADER;
  const request = new Request('https://example.com', {
    headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' },
  });

  try {
    delete process.env.VERCEL;
    delete process.env.TRUSTED_PROXY_IP_HEADER;
    assert.equal(getClientAddress(request), 'unknown');

    process.env.TRUSTED_PROXY_IP_HEADER = 'x-forwarded-for';
    assert.equal(getClientAddress(request), '203.0.113.5');
  } finally {
    if (previousVercel === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = previousVercel;
    }

    if (previousHeader === undefined) {
      delete process.env.TRUSTED_PROXY_IP_HEADER;
    } else {
      process.env.TRUSTED_PROXY_IP_HEADER = previousHeader;
    }
  }
});

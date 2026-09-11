import assert from 'node:assert/strict';
import test from 'node:test';

import { getEasterDate, getSeason } from '../utils/seasonal';

test('computes Gregorian Easter Sundays', () => {
  assert.equal(getEasterDate(2024).toISOString(), '2024-03-31T00:00:00.000Z');
  assert.equal(getEasterDate(2025).toISOString(), '2025-04-20T00:00:00.000Z');
  assert.equal(getEasterDate(2026).toISOString(), '2026-04-05T00:00:00.000Z');
  assert.equal(getEasterDate(2030).toISOString(), '2030-04-21T00:00:00.000Z');
  assert.throws(() => getEasterDate(1582));
});

test('detects seasonal date ranges', () => {
  assert.equal(getSeason(new Date('2026-10-30T12:00:00Z')), 'halloween');
  assert.equal(getSeason(new Date('2026-10-24T12:00:00Z')), 'halloween');
  assert.equal(getSeason(new Date('2026-10-23T12:00:00Z')), 'none');

  assert.equal(getSeason(new Date('2026-01-01T12:00:00Z')), 'new-year');
  assert.equal(getSeason(new Date('2026-01-06T12:00:00Z')), 'new-year');
  assert.equal(getSeason(new Date('2026-01-07T12:00:00Z')), 'none');
  assert.equal(getSeason(new Date('2026-12-20T12:00:00Z')), 'new-year');
  assert.equal(getSeason(new Date('2026-12-25T12:00:00Z')), 'new-year');

  assert.equal(getSeason(new Date('2026-03-29T12:00:00Z')), 'easter');
  assert.equal(getSeason(new Date('2026-04-05T12:00:00Z')), 'easter');
  assert.equal(getSeason(new Date('2026-04-06T12:00:00Z')), 'easter');
  assert.equal(getSeason(new Date('2026-04-07T12:00:00Z')), 'none');

  assert.equal(getSeason(new Date('2026-06-15T12:00:00Z')), 'none');
});

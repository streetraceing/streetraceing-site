import assert from 'node:assert/strict';
import test from 'node:test';

import { formatDateTime } from '../utils/date';

test('formats valid dates and safely preserves invalid string values', () => {
  const value = '2026-08-14T12:30:00.000Z';

  assert.equal(formatDateTime('not-a-date', 'en-US'), 'not-a-date');
  assert.match(formatDateTime(value, 'en-US', 'UTC'), /2026/);
  assert.equal(
    formatDateTime(value, 'en-US', 'UTC'),
    formatDateTime(value, 'en-US', 'UTC'),
  );
});

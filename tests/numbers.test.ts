import assert from 'node:assert/strict';
import test from 'node:test';

import { parsePositiveInteger } from '../utils/numbers';

test('parsePositiveInteger accepts only complete positive integers', () => {
  assert.equal(parsePositiveInteger('12', 1), 12);
  assert.equal(parsePositiveInteger('12abc', 1), 1);
  assert.equal(parsePositiveInteger('0', 1), 1);
  assert.equal(parsePositiveInteger('-2', 1), 1);
  assert.equal(parsePositiveInteger(' 2 ', 1), 1);
});

test('parsePositiveInteger respects the configured maximum', () => {
  assert.equal(parsePositiveInteger('10', 1, 10), 10);
  assert.equal(parsePositiveInteger('11', 1, 10), 1);
});

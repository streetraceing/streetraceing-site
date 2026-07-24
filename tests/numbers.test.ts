import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseNonNegativeInteger,
  parsePositiveInteger,
} from '../utils/numbers';

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

test('parseNonNegativeInteger accepts zero and rejects partial values', () => {
  assert.equal(parseNonNegativeInteger(0, -1, 10), 0);
  assert.equal(parseNonNegativeInteger('8', -1, 10), 8);
  assert.equal(parseNonNegativeInteger('8px', -1, 10), -1);
  assert.equal(parseNonNegativeInteger(-1, -1, 10), -1);
  assert.equal(parseNonNegativeInteger(11, -1, 10), -1);
});

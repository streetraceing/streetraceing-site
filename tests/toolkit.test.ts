import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCronExpression,
  createLineDiff,
  generateSecurePassword,
  getColorContrast,
  jsonToTypeScript,
  removeTrackingParameters,
} from '../utils/toolkit';

test('generates secure passwords with every selected character group', () => {
  const result = generateSecurePassword({
    length: 32,
    lowercase: true,
    uppercase: true,
    numbers: true,
    symbols: true,
    excludeAmbiguous: true,
  });

  assert.equal(result.password.length, 32);
  assert.match(result.password, /[a-z]/);
  assert.match(result.password, /[A-Z]/);
  assert.match(result.password, /\d/);
  assert.match(result.password, /[^A-Za-z0-9]/);
  assert.doesNotMatch(result.password, /[0Oo1Il|]/);
  assert.ok(result.entropyBits > 100);
});

test('converts nested JSON values to TypeScript declarations', () => {
  const output = jsonToTypeScript({
    id: 1,
    profile: { name: 'streetraceing', active: true },
    tags: ['typescript'],
  });

  assert.match(output, /export interface Root/);
  assert.match(output, /profile: RootProfile;/);
  assert.match(output, /tags: string\[\];/);
  assert.match(output, /export interface RootProfile/);
});

test('creates a bounded line diff', () => {
  const output = createLineDiff('one\ntwo', 'one\nthree');

  assert.deepEqual(output, [
    { type: 'same', value: 'one' },
    { type: 'removed', value: 'two' },
    { type: 'added', value: 'three' },
  ]);
});

test('calculates WCAG contrast thresholds', () => {
  const result = getColorContrast('#fff', '#000');

  assert.ok(result);
  assert.equal(result.ratio, 21);
  assert.equal(result.normalAAA, true);
});

test('removes known tracking parameters without touching useful query data', () => {
  const result = removeTrackingParameters(
    'https://example.com/docs?page=2&utm_source=test&fbclid=value',
  );

  assert.equal(result.url, 'https://example.com/docs?page=2');
  assert.deepEqual(result.removed, ['utm_source', 'fbclid']);
});

test('builds common cron expressions', () => {
  assert.equal(
    buildCronExpression({
      frequency: 'weekdays',
      minute: 30,
      hour: 9,
      weekday: 1,
      monthDay: 1,
    }),
    '30 9 * * 1-5',
  );
});

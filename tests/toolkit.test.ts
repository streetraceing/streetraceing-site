import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCronExpression,
  convertNumberBase,
  createLineDiff,
  createSlug,
  generateSecurePassword,
  getColorContrast,
  getColorFormats,
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

test('converts numbers between bases with BigInt precision', () => {
  const decimal = convertNumberBase('255', 10);

  assert.ok(decimal);
  assert.equal(decimal.binary, '11111111');
  assert.equal(decimal.octal, '377');
  assert.equal(decimal.decimal, '255');
  assert.equal(decimal.hexadecimal, 'FF');

  const hexadecimal = convertNumberBase('ff', 16);

  assert.ok(hexadecimal);
  assert.equal(hexadecimal.decimal, '255');

  assert.equal(convertNumberBase('1010', 2)?.decimal, '10');
  assert.equal(convertNumberBase('1_000', 10)?.binary, '1111101000');
  assert.equal(
    convertNumberBase('ffffffffffffffffffff', 16)?.hexadecimal,
    'FFFFFFFFFFFFFFFFFFFF',
  );
  assert.equal(convertNumberBase('9', 8), undefined);
  assert.equal(convertNumberBase('10', 37), undefined);
  assert.equal(convertNumberBase('', 10), undefined);
});

test('converts HEX colors into rgb and hsl notations', () => {
  const red = getColorFormats('#FF0000');

  assert.ok(red);
  assert.equal(red.hex, '#FF0000');
  assert.equal(red.rgbCss, 'rgb(255, 0, 0)');
  assert.equal(red.hslCss, 'hsl(0, 100%, 50%)');

  const blue = getColorFormats('#0044FF');

  assert.ok(blue);
  assert.equal(blue.rgbCss, 'rgb(0, 68, 255)');
  assert.equal(blue.hslCss, 'hsl(224, 100%, 50%)');

  const white = getColorFormats('#fff');

  assert.ok(white);
  assert.equal(white.hex, '#FFFFFF');
  assert.equal(white.hslCss, 'hsl(0, 0%, 100%)');

  assert.equal(getColorFormats('not-a-color'), undefined);
});

test('builds slugs with Cyrillic transliteration', () => {
  assert.equal(createSlug('Привет, мир!'), 'privet-mir');
  assert.equal(createSlug('Тестовый Заголовок'), 'testovyi-zagolovok');
  assert.equal(createSlug('Hello World', '_'), 'hello_world');
  assert.equal(createSlug('Çafé'), 'cafe');
  assert.equal(createSlug('!!!'), '');
});

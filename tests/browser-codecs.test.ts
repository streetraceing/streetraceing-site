import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatLosslessJson,
  MAX_JSON_DEPTH,
  MAX_JSON_INPUT_LENGTH,
} from '../utils/lossless-json';
import { decodeBase64Text, encodeBase64Text } from '../utils/text-codec';
import { decodeJwt } from '../utils/toolkit';
import { parseTimestampValue } from '../utils/timestamp';

test('JSON formatting preserves numeric lexemes, escaped strings, ordering and duplicate members', () => {
  const compact = String.raw`{"n":9007199254740993,"n":1e400,"z":-0,"x":1.2300E+004,"a":"\u0061\/\"","a":"a","10":true,"2":null}`;
  assert.equal(formatLosslessJson(formatLosslessJson(compact), 0), compact);
  const keys = String.raw`{"a":1,"\u0061":2,"__proto__":{"x":1},"__proto__":null}`;
  assert.equal(formatLosslessJson(formatLosslessJson(keys), 0), keys);
  assert.equal(
    formatLosslessJson(' { "a" : [ 1 , { "b" : 2 } ] } '),
    '{\n  "a": [\n    1,\n    {\n      "b": 2\n    }\n  ]\n}',
  );
  for (const primitive of [
    '1e400',
    '-0',
    '9007199254740993',
    'true',
    'null',
    '"  a  "',
  ]) {
    assert.equal(formatLosslessJson(` \r\n${primitive}\t`, 0), primitive);
  }
});

test('JSON formatter rejects malformed grammar and bounds input, depth and output', () => {
  for (const source of [
    '',
    ' ',
    '{"a":1,}',
    '[1,]',
    '{a:1}',
    '01',
    '1.',
    '+1',
    '.1',
    '1e',
    'true false',
    String.raw`"\x00"`,
    '"\n"',
    '"unterminated',
    '\ufeff{}',
    '[,]',
    '{"a" 1}',
    '[1 2]',
  ]) {
    assert.throws(() => formatLosslessJson(source), SyntaxError, source);
  }
  assert.throws(
    () => formatLosslessJson(' '.repeat(MAX_JSON_INPUT_LENGTH + 1)),
    RangeError,
  );
  assert.doesNotThrow(() =>
    formatLosslessJson(
      '['.repeat(MAX_JSON_DEPTH) + '0' + ']'.repeat(MAX_JSON_DEPTH),
      0,
    ),
  );
  assert.throws(
    () =>
      formatLosslessJson(
        '['.repeat(MAX_JSON_DEPTH + 1) + '0' + ']'.repeat(MAX_JSON_DEPTH + 1),
      ),
    RangeError,
  );
  const expanded =
    '['.repeat(100) + Array(10_000).fill('0').join(',') + ']'.repeat(100);
  assert.throws(() => formatLosslessJson(expanded, 10), RangeError);
});

test('strict UTF-8 Base64 round-trips Unicode, BOM and empty strings', () => {
  for (const alphabet of ['base64', 'base64url'] as const) {
    for (const text of [
      '',
      '\ufeffhello',
      '\ufeff\ufeff',
      'Привет 世界 \u{1f680}',
      'a\0b',
    ]) {
      assert.equal(
        decodeBase64Text(encodeBase64Text(text, alphabet), alphabet),
        text,
      );
    }
  }
  assert.equal(decodeBase64Text('Zg=='), 'f');
  assert.equal(decodeBase64Text('Zg', 'base64url'), 'f');
  assert.throws(() => encodeBase64Text('\ud800'));
  assert.throws(() => encodeBase64Text('\udc00'));
});

test('Base64 rejects invalid alphabets, whitespace, padding, pad bits and UTF-8', () => {
  for (const value of [
    'Zg',
    'Zg=',
    'Zg===',
    '=Zg=',
    'Zh==',
    'Zm9=',
    ' Zg==',
    'Zg==\n',
    'Zg==\u00a0',
    '-w==',
    '_w==',
    'A',
    '/w==',
    'wK8=',
    '7aCA',
    '4oI=',
  ]) {
    assert.throws(() => decodeBase64Text(value), value);
  }
  for (const value of [
    'Zg==',
    'Zg=',
    'Zh',
    'Z g',
    'Zg\n',
    'A',
    '+w',
    '/w',
    '_w',
  ]) {
    assert.throws(() => decodeBase64Text(value, 'base64url'), value);
  }
});

test('JWT uses strict base64url and fatal UTF-8 for JSON segments', () => {
  const header = encodeBase64Text('{"alg":"none"}', 'base64url');
  const payload = encodeBase64Text('{"name":"世界"}', 'base64url');
  assert.deepEqual(decodeJwt(`${header}.${payload}.`).payload, {
    name: '世界',
  });
  assert.throws(() => decodeJwt(`${header}._w.`));
  assert.throws(() => decodeJwt(`${header}.${payload}=.`));
  assert.throws(() => decodeJwt(` ${header}.${payload}.`));
  assert.throws(() => decodeJwt(`${header}.${payload}.Zh`));
});

test('timestamp units are explicit, epoch-safe and validated after TimeClip', () => {
  assert.equal(
    parseTimestampValue('0', 'seconds')?.toISOString(),
    '1970-01-01T00:00:00.000Z',
  );
  assert.equal(parseTimestampValue('1000', 'seconds')?.getTime(), 1_000_000);
  assert.equal(parseTimestampValue('1000', 'milliseconds')?.getTime(), 1000);
  assert.equal(parseTimestampValue('-0.001', 'seconds')?.getTime(), -1);
  assert.equal(
    Math.floor(
      (parseTimestampValue('-1', 'milliseconds')?.getTime() ?? 0) / 1000,
    ),
    -1,
  );
  for (const sign of ['', '-']) {
    assert.ok(parseTimestampValue(`${sign}8640000000000000`, 'milliseconds'));
    assert.ok(parseTimestampValue(`${sign}8640000000000`, 'seconds'));
    assert.equal(
      parseTimestampValue(`${sign}8640000000000001`, 'milliseconds'),
      undefined,
    );
    assert.equal(
      parseTimestampValue(`${sign}8640000000001`, 'seconds'),
      undefined,
    );
  }
  for (const source of ['', 'Infinity', 'NaN', '1e400', '12abc', '0x10']) {
    assert.equal(parseTimestampValue(source, 'seconds'), undefined);
  }
});

test('ISO accepts explicit offsets and UTC dates, rejects rollover and ambiguous local times', () => {
  assert.equal(parseTimestampValue('1970-01-01', 'iso')?.getTime(), 0);
  assert.equal(
    parseTimestampValue('1970-01-01T01:00:00+01:00', 'iso')?.getTime(),
    0,
  );
  assert.equal(
    parseTimestampValue('0000-02-29T00:00:00Z', 'iso')?.getUTCFullYear(),
    0,
  );
  assert.ok(parseTimestampValue('2000-02-29', 'iso'));
  assert.ok(parseTimestampValue('+275760-09-13T00:00:00.000Z', 'iso'));
  for (const source of [
    '1900-02-29',
    '2024-02-30',
    '2024-13-01',
    '2024-00-01',
    '2024-01-00',
    '2024-01-01T00:00:00',
    '2024-01-01T24:00:00Z',
    '2024-01-01T00:00:60Z',
    '2024-01-01T00:00:00+24:00',
    '0',
    '01/02/2024',
    '+275760-09-13T00:00:00.001Z',
    '-000000-01-01',
  ]) {
    assert.equal(parseTimestampValue(source, 'iso'), undefined, source);
  }
});

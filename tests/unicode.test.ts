import assert from 'node:assert/strict';
import test from 'node:test';

import { inspectUnicode } from '../utils/unicode';

test('Unicode inspection distinguishes code points, UTF-16 units, and UTF-8 bytes', () => {
  const result = inspectUnicode('A\u00e9\u4e2d\u{1d11e}');
  assert.equal(result.codePoints, 4);
  assert.equal(result.utf16Units, 5);
  assert.equal(result.utf8Bytes, 10);
  assert.deepEqual(
    result.rows.map((row) => row.codePoint),
    ['U+0041', 'U+00E9', 'U+4E2D', 'U+1D11E'],
  );
  assert.deepEqual(
    result.rows.map((row) => row.utf8),
    ['41', 'C3 A9', 'E4 B8 AD', 'F0 9D 84 9E'],
  );
  assert.deepEqual(
    result.rows.map((row) => row.character),
    ['A', '\u00e9', '\u4e2d', '\u{1d11e}'],
  );
  assert.equal(result.rows[0].name, 'VISIBLE CHARACTER');
});

test('UTF-8 encoding handles byte-width boundaries without a DOM or encoder dependency', () => {
  const result = inspectUnicode(
    '\u0000\u007f\u0080\u07ff\u0800\uffff\u{10000}\u{10ffff}',
  );
  assert.deepEqual(
    result.rows.map((row) => row.utf8),
    [
      '00',
      '7F',
      'C2 80',
      'DF BF',
      'E0 A0 80',
      'EF BF BF',
      'F0 90 80 80',
      'F4 8F BF BF',
    ],
  );
  assert.equal(result.utf8Bytes, 20);
  assert.equal(result.utf16Units, 10);
  assert.equal(result.codePoints, 8);
});

test('invisible characters and controls use stable semantic labels instead of raw display text', () => {
  const cases = [
    [' ', 'SPACE'],
    ['\t', 'TAB'],
    ['\n', 'LINE FEED'],
    ['\r', 'CARRIAGE RETURN'],
    ['\u0000', 'NULL'],
    ['\u001b', 'ESCAPE'],
    ['\u007f', 'DELETE'],
    ['\u0085', 'NEXT LINE'],
    ['\u00a0', 'NO-BREAK SPACE'],
    ['\u00ad', 'SOFT HYPHEN'],
    ['\u034f', 'COMBINING GRAPHEME JOINER'],
    ['\u200b', 'ZERO WIDTH SPACE'],
    ['\u200c', 'ZERO WIDTH NON-JOINER'],
    ['\u200d', 'ZERO WIDTH JOINER'],
    ['\u202e', 'RIGHT-TO-LEFT OVERRIDE'],
    ['\u2066', 'LEFT-TO-RIGHT ISOLATE'],
    ['\u2069', 'POP DIRECTIONAL ISOLATE'],
    ['\ufeff', 'ZERO WIDTH NO-BREAK SPACE / BOM'],
    ['\ufe0f', 'VARIATION SELECTOR-16'],
    ['\u{e0100}', 'VARIATION SELECTOR-17'],
    ['\u{e01ef}', 'VARIATION SELECTOR-256'],
    ['\u2800', 'BRAILLE PATTERN BLANK'],
  ] as const;
  for (const [character, name] of cases) {
    const row = inspectUnicode(character).rows[0];
    assert.equal(row.character, name);
    assert.equal(row.name, name);
  }
  assert.equal(inspectUnicode('\u0600').rows[0].name, 'FORMAT CONTROL U+0600');
  const controls = inspectUnicode(
    String.fromCharCode(...Array.from({ length: 32 }, (_, index) => index)),
  );
  assert.equal(
    controls.rows.every((row) => row.character === row.name),
    true,
  );
});

test('lone surrogates are explicitly invalid UTF-16, with replacement-byte totals', () => {
  const source = '\ud800A\udc00';
  const result = inspectUnicode(source);
  assert.equal(result.codePoints, 3);
  assert.equal(result.utf16Units, 3);
  assert.equal(result.utf8Bytes, 7);
  assert.deepEqual(
    result.rows.map((row) => row.codePoint),
    ['U+D800', 'U+0041', 'U+DC00'],
  );
  assert.equal(result.rows[0].name, 'LONE HIGH SURROGATE');
  assert.equal(result.rows[2].name, 'LONE LOW SURROGATE');
  assert.equal(result.rows[0].character, 'LONE HIGH SURROGATE');
  assert.equal(result.rows[0].utf8, 'INVALID UTF-16; REPLACEMENT EF BF BD');
  assert.equal(result.rows[2].utf8, 'INVALID UTF-16; REPLACEMENT EF BF BD');
  for (const normalization of [
    result.nfc,
    result.nfd,
    result.nfkc,
    result.nfkd,
  ]) {
    assert.equal(normalization, source);
  }
  const mixed = inspectUnicode('\ud800\ud800\udc00\udc00');
  assert.equal(mixed.codePoints, 3);
  assert.equal(mixed.utf8Bytes, 10);
  assert.equal(mixed.rows[1].codePoint, 'U+10000');
  assert.equal(mixed.rows[1].utf8, 'F0 90 80 80');
});

test('normalization returns all four forms without confusing graphemes and code points', () => {
  const source = '\u00e9\u2460\ufb00';
  const result = inspectUnicode(source);
  assert.equal(result.nfc, source);
  assert.equal(result.nfd, 'e\u0301\u2460\ufb00');
  assert.equal(result.nfkc, '\u00e91ff');
  assert.equal(result.nfkd, 'e\u03011ff');
  const combining = inspectUnicode('e\u0301');
  assert.equal(combining.codePoints, 2);
  assert.equal(combining.utf16Units, 2);
  assert.equal(combining.utf8Bytes, 3);
  assert.equal(combining.nfc, '\u00e9');
  assert.equal(combining.rows[1].character, '\u0301');
});

test('Unicode limit counts code points inclusively, not UTF-16 units', () => {
  assert.deepEqual(inspectUnicode(''), {
    codePoints: 0,
    utf16Units: 0,
    utf8Bytes: 0,
    rows: [],
    nfc: '',
    nfd: '',
    nfkc: '',
    nfkd: '',
  });
  assert.equal(inspectUnicode('a'.repeat(2_000)).codePoints, 2_000);
  const supplementary = inspectUnicode('\u{1d11e}'.repeat(2_000));
  assert.equal(supplementary.codePoints, 2_000);
  assert.equal(supplementary.utf16Units, 4_000);
  assert.equal(supplementary.utf8Bytes, 8_000);
  for (const source of [
    'a'.repeat(2_001),
    '\u{1d11e}'.repeat(2_001),
    '\ud800'.repeat(2_001),
  ]) {
    assert.throws(() => inspectUnicode(source), {
      name: 'RangeError',
      message: 'limit',
    });
  }
});

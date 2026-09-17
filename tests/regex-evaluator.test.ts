import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceRegexIndex,
  evaluateRegex,
  REGEX_LIMITS,
  validateRegexRequest,
} from '../utils/regex-evaluator';

test('regex honors explicit flags without adding global or deduplicating', () => {
  const single = evaluateRegex({ pattern: 'a', source: 'Aa a', flags: 'i' });
  assert.ok(single.ok);
  assert.equal(single.count, 1);
  const global = evaluateRegex({ pattern: 'a', source: 'Aa a', flags: 'gi' });
  assert.ok(global.ok);
  assert.equal(global.count, 3);
  const sticky = evaluateRegex({ pattern: 'a', source: 'a a', flags: 'y' });
  assert.ok(sticky.ok);
  assert.equal(sticky.count, 1);
  for (const flags of ['gg', 'ii', 'uv', 'g ', 'g\n', 'x']) {
    assert.deepEqual(evaluateRegex({ pattern: '.', source: '', flags }), {
      ok: false,
      error: 'invalidFlags',
    });
  }
  assert.deepEqual(evaluateRegex({ pattern: '[', source: '', flags: '' }), {
    ok: false,
    error: 'invalid',
  });
});

test('regex advances zero-width Unicode matches by code point, including end of input', () => {
  for (const flags of ['gu', 'gv']) {
    const result = evaluateRegex({
      pattern: '(?:)',
      source: '\u{1f680}x',
      flags,
    });
    if (flags === 'gv' && !result.ok) {
      assert.deepEqual(result, { ok: false, error: 'invalid' });
      continue;
    }
    assert.ok(result.ok);
    assert.equal(result.count, 3);
    assert.match(result.output, /#2 \[2\.\.2\]/);
    assert.match(result.output, /#3 \[3\.\.3\]/);
  }
  const units = evaluateRegex({
    pattern: '(?:)',
    source: '\u{1f680}x',
    flags: 'g',
  });
  assert.ok(units.ok);
  assert.equal(units.count, 4);
  assert.equal(advanceRegexIndex('\ud800x', 0, true), 1);
  assert.equal(advanceRegexIndex('', 0, true), 1);
});

test('regex bounds input, matches and output without executing an extra capped match', () => {
  assert.equal(
    validateRegexRequest({
      pattern: 'a'.repeat(REGEX_LIMITS.pattern + 1),
      source: '',
      flags: '',
    }),
    'inputLimit',
  );
  assert.equal(
    validateRegexRequest({
      pattern: '',
      source: 'a'.repeat(REGEX_LIMITS.source + 1),
      flags: '',
    }),
    'inputLimit',
  );
  const capped = evaluateRegex({
    pattern: '(?:)',
    source: 'a'.repeat(500),
    flags: 'g',
  });
  assert.ok(capped.ok);
  assert.equal(capped.count, 200);
  assert.equal(capped.limited, true);
  const output = evaluateRegex({
    pattern: '(.+)(?<end>)',
    source: 'a'.repeat(50_000),
    flags: '',
  });
  assert.ok(output.ok);
  assert.equal(output.output.length, REGEX_LIMITS.output);
  assert.equal(output.limited, true);
});

test('match cap is checked before executing a 201st match', (context) => {
  const original = RegExp.prototype.exec;
  let calls = 0;
  context.mock.method(
    RegExp.prototype,
    'exec',
    function (this: RegExp, source: string) {
      if (this.source === 'x') calls += 1;
      return original.call(this, source);
    },
  );
  const result = evaluateRegex({
    pattern: 'x',
    source: 'x'.repeat(201),
    flags: 'g',
  });
  assert.ok(result.ok);
  assert.equal(calls, REGEX_LIMITS.matches);
});

test('regex renders captures and named groups without executing source text', () => {
  const result = evaluateRegex({
    pattern: '(?<letter>a)(b)?',
    source: 'a',
    flags: 'd',
  });
  assert.ok(result.ok);
  assert.match(result.output, /\$1: a/);
  assert.match(result.output, /letter: a/);
  assert.doesNotMatch(result.output, /\$2:/);
  const none = evaluateRegex({ pattern: 'z', source: 'a', flags: 'g' });
  assert.deepEqual(none, { ok: true, count: 0, output: '', limited: false });
});

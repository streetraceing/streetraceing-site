import assert from 'node:assert/strict';
import test from 'node:test';

import { JsonPointerError, resolveJsonPointer } from '../utils/json-pointer';

test('JSON Pointer resolves the RFC 6901 examples and returns the root by identity', () => {
  const value = {
    foo: ['bar', 'baz'],
    '': 0,
    'a/b': 1,
    'c%d': 2,
    'e^f': 3,
    'g|h': 4,
    'i\\j': 5,
    'k"l': 6,
    ' ': 7,
    'm~n': 8,
  };
  assert.equal(resolveJsonPointer(value, ''), value);
  assert.equal(resolveJsonPointer(value, '/foo'), value.foo);
  for (const [pointer, expected] of [
    ['/foo/0', 'bar'],
    ['/', 0],
    ['/a~1b', 1],
    ['/c%d', 2],
    ['/e^f', 3],
    ['/g|h', 4],
    ['/i\\j', 5],
    ['/k"l', 6],
    ['/ ', 7],
    ['/m~0n', 8],
  ] as const) {
    assert.equal(resolveJsonPointer(value, pointer), expected);
  }
  assert.equal(
    resolveJsonPointer({ '~1': 'literal', '/': 'slash' }, '/~01'),
    'literal',
  );
  assert.equal(
    resolveJsonPointer({ a: { '': { '': 'empty' } } }, '/a//'),
    'empty',
  );
  assert.equal(
    resolveJsonPointer({ '\u0000': 'nul', 世界: 'unicode' }, '/\u0000'),
    'nul',
  );
  assert.equal(resolveJsonPointer({ 世界: 'unicode' }, '/世界'), 'unicode');
});

test('missing values, null, falsy data, and own undefined properties remain distinct', () => {
  const value = { null: null, false: false, zero: 0, empty: '', undefined };
  for (const key of Object.keys(value)) {
    assert.equal(
      resolveJsonPointer(value, `/${key}`),
      value[key as keyof typeof value],
    );
  }
  assert.equal(resolveJsonPointer(null, ''), null);
  assert.equal(resolveJsonPointer(3, ''), 3);
  assert.equal(resolveJsonPointer(undefined, ''), undefined);
  for (const pointer of ['/missing', '/null/a', '/false/a', '/empty/length']) {
    assert.throws(() => resolveJsonPointer(value, pointer), {
      name: 'JsonPointerError',
      code: 'missing',
    });
  }
});

test('only own data properties are traversed, without prototype or accessor traversal', () => {
  const value = JSON.parse(
    '{"__proto__":{"safe":1},"constructor":{"prototype":2}}',
  );
  assert.equal(resolveJsonPointer(value, '/__proto__/safe'), 1);
  assert.equal(resolveJsonPointer(value, '/constructor/prototype'), 2);
  for (const pointer of ['/__proto__', '/constructor', '/toString']) {
    assert.throws(() => resolveJsonPointer({}, pointer), { code: 'missing' });
  }
  assert.throws(
    () => resolveJsonPointer(Object.create({ inherited: 1 }), '/inherited'),
    { code: 'missing' },
  );
  let calls = 0;
  const accessor = Object.defineProperty({}, 'value', {
    get() {
      calls++;
      return 1;
    },
  });
  assert.throws(() => resolveJsonPointer(accessor, '/value'), {
    code: 'missing',
  });
  assert.equal(calls, 0);
});

test('array tokens are canonical indexes and cannot access array properties or holes', () => {
  const value = ['zero', null];
  assert.equal(resolveJsonPointer(value, '/0'), 'zero');
  assert.equal(resolveJsonPointer(value, '/1'), null);
  for (const pointer of [
    '/-',
    '/00',
    '/01',
    '/+1',
    '/-1',
    '/1.0',
    '/1e0',
    '/ 1',
    '/0\n',
    '/length',
    '/',
  ]) {
    assert.throws(() => resolveJsonPointer(value, pointer), { code: 'syntax' });
  }
  for (const pointer of ['/2', '/4294967295', '/9007199254740993']) {
    assert.throws(() => resolveJsonPointer(value, pointer), {
      code: 'missing',
    });
  }
  assert.throws(() => resolveJsonPointer(new Array(1), '/0'), {
    code: 'missing',
  });
  assert.equal(resolveJsonPointer({ '01': 1, '-': 2 }, '/01'), 1);
  assert.equal(resolveJsonPointer({ '01': 1, '-': 2 }, '/-'), 2);
});

test('pointer syntax is strict, validated before traversal, and not URI-decoded', () => {
  for (const pointer of [
    'foo',
    '#/foo',
    '/~',
    '/~2',
    '/a~x',
    '/missing/~3',
    '/~~0',
  ]) {
    assert.throws(() => resolveJsonPointer({}, pointer), {
      name: 'JsonPointerError',
      code: 'syntax',
    });
  }
  assert.equal(resolveJsonPointer({ '%2F': 1 }, '/%2F'), 1);
  assert.throws(() => resolveJsonPointer({}, '/a'), JsonPointerError);
});

test('pointer length and depth bounds apply even to cyclic or missing inputs', () => {
  const key = 'a'.repeat(4_095);
  assert.equal(resolveJsonPointer({ [key]: 'ok' }, `/${key}`), 'ok');
  assert.throws(() => resolveJsonPointer({}, '/' + 'a'.repeat(4_096)), {
    code: 'limit',
  });
  const cyclic: { a?: unknown } = {};
  cyclic.a = cyclic;
  assert.equal(resolveJsonPointer(cyclic, '/a'.repeat(100)), cyclic);
  assert.throws(() => resolveJsonPointer(cyclic, '/a'.repeat(101)), {
    code: 'limit',
  });
  assert.throws(() => resolveJsonPointer({}, '/a'.repeat(101)), {
    code: 'limit',
  });
});

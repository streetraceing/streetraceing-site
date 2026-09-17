import assert from 'node:assert/strict';
import test from 'node:test';

import { CsvError, csvToJson, jsonToCsv, parseDelimited } from '../utils/csv';

test('delimited parsing preserves strings, quoted separators, CRLF, and doubled quotes', () => {
  assert.deepEqual(
    parseDelimited(
      '\uFEFFid,text,extra\r\n001," hello,\r\n世界 ""quoted"" ",\r\n',
      ',',
    ),
    [
      ['id', 'text', 'extra'],
      ['001', ' hello,\r\n世界 "quoted" ', ''],
    ],
  );
  assert.deepEqual(parseDelimited('a;"b;c";"d\ne"', ';'), [
    ['a', 'b;c', 'd\ne'],
  ]);
  assert.deepEqual(parseDelimited('a\t"b\tc"\t', '\t'), [['a', 'b\tc', '']]);
  assert.deepEqual(parseDelimited('a\rb\rc', ','), [['a'], ['b'], ['c']]);
  assert.deepEqual(parseDelimited('a,"\uFEFFb"', ','), [['a', '\uFEFFb']]);
});

test('empty input, blank records, trailing fields, and final newlines remain distinct', () => {
  assert.deepEqual(parseDelimited('', ','), []);
  assert.deepEqual(parseDelimited('\uFEFF', ','), []);
  assert.deepEqual(parseDelimited('""', ','), [['']]);
  assert.deepEqual(parseDelimited(',', ','), [['', '']]);
  assert.deepEqual(parseDelimited('\n\n', ','), [[''], ['']]);
  assert.deepEqual(parseDelimited('a\n', ','), [['a']]);
  assert.deepEqual(parseDelimited('a\n\n', ','), [['a'], ['']]);
  assert.deepEqual(parseDelimited('""""', ','), [['"']]);
});

test('malformed quote structures expose typed errors and physical source lines', () => {
  for (const source of ['a"b', '"a"b', '"a" ', ' "a"']) {
    assert.throws(() => parseDelimited(source, ','), {
      name: 'CsvError',
      code: 'malformed-quote',
      line: 1,
    });
  }
  assert.throws(() => parseDelimited('header\r\n"open\r\nfield', ','), {
    name: 'CsvError',
    code: 'unterminated-quote',
    line: 2,
  });
  assert.throws(() => parseDelimited('header\r\n"a\r\nb"x', ','), {
    code: 'malformed-quote',
    line: 3,
  });
  assert.throws(() => parseDelimited('"', ','), CsvError);
});

test('CSV to JSON requires exact unique nonblank headers and consistent field counts', () => {
  assert.throws(() => csvToJson('', ','), { code: 'missing-header' });
  assert.throws(() => csvToJson('\uFEFF', ','), { code: 'missing-header' });
  for (const source of ['a,\n1,2', 'a, \t\n1,2', '""\nx']) {
    assert.throws(() => csvToJson(source, ','), { code: 'blank-header' });
  }
  assert.throws(() => csvToJson('a,a\n1,2', ','), { code: 'duplicate-header' });
  for (const source of ['a,b\n1', 'a\n1,2']) {
    assert.throws(() => csvToJson(source, ','), { code: 'field-count' });
  }
  assert.deepEqual(JSON.parse(csvToJson('a, a \n001, false ', ',')), [
    { a: '001', ' a ': ' false ' },
  ]);
  assert.equal(csvToJson('header', ','), '[]');
  assert.deepEqual(JSON.parse(csvToJson('value\n\n', ',')), [{ value: '' }]);
});

test('CSV conversion treats prototype-like keys as literal data', () => {
  const source = '__proto__,constructor,toString\n001,false, null ';
  const result = JSON.parse(csvToJson(source, ','));
  assert.equal(
    Object.prototype.hasOwnProperty.call(result[0], '__proto__'),
    true,
  );
  assert.equal(result[0].__proto__, '001');
  assert.equal(result[0].constructor, 'false');
  assert.equal(result[0].toString, ' null ');
  assert.deepEqual(
    parseDelimited(jsonToCsv(JSON.stringify(result), ',', false), ','),
    parseDelimited(source, ','),
  );
  assert.deepEqual(
    parseDelimited(jsonToCsv('[{"a":1},{"__proto__":"x"}]', ',', false), ','),
    [
      ['a', '__proto__'],
      ['1', ''],
      ['', 'x'],
    ],
  );
});

test('JSON to CSV uses first-seen keys and escapes strings without nested coercion', () => {
  const records = [
    { id: '001', text: ' hello,"世界"\r\nnext ', active: true, empty: null },
    { later: 2, id: '002', active: false },
  ];
  for (const delimiter of [',', ';', '\t'] as const) {
    assert.deepEqual(
      parseDelimited(
        jsonToCsv(JSON.stringify(records), delimiter, false),
        delimiter,
      ),
      [
        ['id', 'text', 'active', 'empty', 'later'],
        ['001', ' hello,"世界"\r\nnext ', 'true', '', ''],
        ['002', '', 'false', '', '2'],
      ],
    );
  }
  assert.equal(jsonToCsv('[]', ',', true), '');
  assert.deepEqual(parseDelimited(jsonToCsv('[{"a":null}]', ',', false), ','), [
    ['a'],
    [''],
  ]);
  assert.deepEqual(parseDelimited(jsonToCsv('[{"a":-0}]', ',', false), ','), [
    ['a'],
    ['-0'],
  ]);
  assert.deepEqual(
    parseDelimited(jsonToCsv('[{"\uFEFFid":"001"}]', ',', false), ','),
    [['\uFEFFid'], ['001']],
  );
  assert.throws(() => jsonToCsv('[', ',', false), { code: 'invalid-json' });
  for (const source of ['{}', 'null', '[null]', '[[]]', '[1]', '["x"]']) {
    assert.throws(() => jsonToCsv(source, ',', false), {
      code: 'invalid-record',
    });
  }
  for (const source of ['[{"a":{}}]', '[{"a":[]}]']) {
    assert.throws(() => jsonToCsv(source, ',', false), {
      code: 'nested-value',
    });
  }
  assert.throws(() => jsonToCsv('[{}]', ',', false), {
    code: 'missing-header',
  });
  assert.throws(() => jsonToCsv('[{"a":1e999}]', ',', false), {
    code: 'invalid-value',
  });
});

test('formula protection covers headers, controls, whitespace evasions, and numeric negatives', () => {
  const dangerous = [
    '=1+1',
    '+1',
    '-1',
    '@SUM(A1)',
    '\ttext',
    '\rtext',
    '   =1',
    ' \ttext',
    '\n +1',
    '\u00A0-1',
    '\u200B@x',
    '\u0000=1',
    '\uFEFF=1',
  ];
  for (const value of dangerous) {
    const source = JSON.stringify([{ [value]: value }]);
    assert.deepEqual(parseDelimited(jsonToCsv(source, ',', true), ','), [
      [`'${value}`],
      [`'${value}`],
    ]);
    assert.deepEqual(parseDelimited(jsonToCsv(source, ',', false), ','), [
      [value],
      [value],
    ]);
  }
  assert.deepEqual(
    parseDelimited(jsonToCsv('[{"value":-2}]', ',', true), ','),
    [['value'], ["'-2"]],
  );
  const safe = ['001', ' text ', "'=1", 'word=1', 'a\tb', '世界'];
  assert.deepEqual(
    parseDelimited(
      jsonToCsv(JSON.stringify(safe.map((value) => ({ value }))), ',', true),
      ',',
    ),
    [['value'], ...safe.map((value) => [value])],
  );
});

test('CSV input, logical-row, column, and output amplification limits are enforced', () => {
  assert.equal(parseDelimited('a'.repeat(200_000), ',')[0][0].length, 200_000);
  assert.throws(() => parseDelimited('a'.repeat(200_001), ','), {
    code: 'input-limit',
  });
  assert.throws(() => jsonToCsv(' '.repeat(200_001), ',', true), {
    code: 'input-limit',
  });
  assert.equal(parseDelimited('x\n'.repeat(5_000), ',').length, 5_000);
  assert.throws(() => parseDelimited('x\n'.repeat(5_001), ','), {
    code: 'row-limit',
  });
  assert.equal(parseDelimited('"' + '\n'.repeat(5_001) + '"', ',').length, 1);
  assert.equal(
    parseDelimited(Array(100).fill('x').join(','), ',')[0].length,
    100,
  );
  assert.throws(() => parseDelimited(Array(101).fill('x').join(','), ','), {
    code: 'column-limit',
  });
  const wide = Object.fromEntries(
    Array.from({ length: 101 }, (_, index) => [`k${index}`, index]),
  );
  assert.throws(() => jsonToCsv(JSON.stringify([wide]), ',', false), {
    code: 'column-limit',
  });
  const union = Array.from({ length: 101 }, (_, index) => ({
    [`k${index}`]: index,
  }));
  assert.throws(() => jsonToCsv(JSON.stringify(union), ',', false), {
    code: 'column-limit',
  });
  assert.equal(
    parseDelimited(
      jsonToCsv(JSON.stringify(Array(4_999).fill({ a: 1 })), ',', false),
      ',',
    ).length,
    5_000,
  );
  assert.throws(
    () => jsonToCsv(JSON.stringify(Array(5_000).fill({ a: 1 })), ',', false),
    { code: 'row-limit' },
  );
  assert.throws(() => csvToJson('h'.repeat(1_000) + '\nx'.repeat(2_100), ','), {
    code: 'output-limit',
  });
});

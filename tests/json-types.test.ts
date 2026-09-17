import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import { jsonToTypeScript } from '../utils/toolkit';

function assertAssignable(
  sample: unknown,
  rootName = 'Root',
  declaredName = rootName,
) {
  const declarations = jsonToTypeScript(sample, rootName);
  const file = ts.sys.resolvePath('__virtual_json_sample__.ts');
  const text = `${declarations}\nconst sample: ${declaredName} = ${JSON.stringify(sample)};\nvoid sample;`;
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
    target: ts.ScriptTarget.ESNext,
  };
  const host = ts.createCompilerHost(options);
  const original = host.getSourceFile.bind(host);
  host.getSourceFile = (
    name,
    languageVersion,
    onError,
    shouldCreateNewSourceFile,
  ) =>
    name === file
      ? ts.createSourceFile(file, text, languageVersion, true)
      : original(name, languageVersion, onError, shouldCreateNewSourceFile);
  const program = ts.createProgram([file], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(
    diagnostics.length,
    0,
    diagnostics
      .map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\n'))
      .join('\n') +
      '\n' +
      declarations,
  );
  return declarations;
}

test('heterogeneous object arrays keep every structural variant assignable', () => {
  const output = assertAssignable([{ a: 1 }, { a: 'x', b: true }, { c: null }]);
  assert.match(output, /a: number/);
  assert.match(output, /a: string/);
  assert.match(output, /b: boolean/);
  assert.match(output, /RootItem2/);
});

test('normalized interface collisions do not overwrite properties or declarations', () => {
  const output = assertAssignable({
    a: { x: 1 },
    A: { y: 's' },
    'a-b': { z: true },
    aB: { n: null },
    '': {},
    'a b': [],
    'line\n': 'value',
    'line\r': true,
  });
  assert.match(output, /a: RootA;/);
  assert.match(output, /A: RootA2;/);
  assert.match(output, /"a-b": RootAB;/);
  assert.match(output, /aB: RootAB2;/);
});

test('root arrays, nested arrays, empty arrays and primitive roots produce valid aliases', () => {
  for (const sample of [
    [],
    [[], [1], ['x', null]],
    [[{ x: 1 }], [{ y: 'x' }]],
    [{ x: [] }, 1, null],
    { empty: [] },
    {},
    null,
    true,
    1,
    'x',
  ]) {
    assertAssignable(sample);
  }
  assertAssignable([{ value: 1 }], 'Array', 'Array2');
  assertAssignable({ value: [] }, 'String', 'String2');
  assertAssignable([1], 'class', 'Class');
  assertAssignable([{}], '123 !', 'Value');
  assertAssignable([{ item: {} }], 'RootItem');
});

test('type generation rejects excessive nesting, width and cyclic samples', () => {
  let sample: unknown = 1;
  for (let index = 0; index < 102; index += 1) sample = [sample];
  assert.throws(() => jsonToTypeScript(sample), RangeError);
  assert.throws(() => jsonToTypeScript(Array(10_001).fill(0)), RangeError);
  const cycle: unknown[] = [];
  cycle.push(cycle);
  assert.throws(() => jsonToTypeScript(cycle), RangeError);
});

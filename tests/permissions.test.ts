import assert from 'node:assert/strict';
import test from 'node:test';

import { formatUnixMode, parseUnixMode } from '../utils/permissions';

test('Unix modes accept octal and symbolic forms and expose every permission bit', () => {
  const expected = {
    octal: '0755',
    symbolic: 'rwxr-xr-x',
    owner: { read: true, write: true, execute: true },
    group: { read: true, write: false, execute: true },
    other: { read: true, write: false, execute: true },
    setuid: false,
    setgid: false,
    sticky: false,
  };
  assert.deepEqual(parseUnixMode('755'), expected);
  assert.deepEqual(parseUnixMode('0755'), expected);
  assert.deepEqual(parseUnixMode('rwxr-xr-x'), expected);
  assert.deepEqual(formatUnixMode(0o755), expected);
  assert.deepEqual(parseUnixMode('000'), {
    octal: '0000',
    symbolic: '---------',
    owner: { read: false, write: false, execute: false },
    group: { read: false, write: false, execute: false },
    other: { read: false, write: false, execute: false },
    setuid: false,
    setgid: false,
    sticky: false,
  });
});

test('special bits use s/S and t/T according to the corresponding execute permission', () => {
  for (const [octal, symbolic] of [
    ['4755', 'rwsr-xr-x'],
    ['4644', 'rwSr--r--'],
    ['2755', 'rwxr-sr-x'],
    ['2640', 'rw-r-S---'],
    ['1777', 'rwxrwxrwt'],
    ['1766', 'rwxrw-rwT'],
    ['7000', '--S--S--T'],
    ['7777', 'rwsrwsrwt'],
  ]) {
    assert.equal(parseUnixMode(octal)?.symbolic, symbolic);
    assert.equal(parseUnixMode(symbolic)?.octal, octal);
  }
  const allSpecial = parseUnixMode('--S--S--T');
  assert.ok(allSpecial);
  assert.equal(allSpecial.setuid, true);
  assert.equal(allSpecial.setgid, true);
  assert.equal(allSpecial.sticky, true);
  assert.equal(allSpecial.owner.execute, false);
  assert.equal(allSpecial.group.execute, false);
  assert.equal(allSpecial.other.execute, false);
});

test('Unix modes reject partial values, whitespace, file types, and misplaced flags', () => {
  for (const value of [
    '',
    '0',
    '75',
    '00755',
    '888',
    '0788',
    '0o755',
    '755x',
    '-755',
    ' 755',
    '755 ',
    '755\n',
    '0755\n',
    '755\r',
    'rwxrwxrwx\n',
    'drwxr-xr-x',
    '-rwxr-xr-x',
    'RWXR-XR-X',
    'rwxrwxrws',
    'rwt------',
    '-----t---',
    'swxrwxrwx',
    'rwxr-xr-',
  ]) {
    assert.equal(parseUnixMode(value), undefined, value);
  }
  assert.equal(parseUnixMode('rwxrwxrw-')?.octal, '0776');
  for (const mode of [
    -1,
    0o10000,
    1.5,
    NaN,
    Infinity,
    -Infinity,
    Number.MAX_SAFE_INTEGER,
  ]) {
    assert.equal(formatUnixMode(mode), undefined);
  }
});

test('all 4096 Unix modes round-trip exactly through octal and symbolic notation', () => {
  for (let mode = 0; mode <= 0o7777; mode++) {
    const formatted = formatUnixMode(mode);
    assert.ok(formatted);
    assert.equal(formatted.octal.length, 4);
    assert.equal(formatted.symbolic.length, 9);
    assert.deepEqual(parseUnixMode(formatted.octal), formatted);
    assert.deepEqual(parseUnixMode(formatted.symbolic), formatted);
    assert.equal(formatted.setuid, (mode & 0o4000) !== 0);
    assert.equal(formatted.setgid, (mode & 0o2000) !== 0);
    assert.equal(formatted.sticky, (mode & 0o1000) !== 0);
    for (const [bits, shift] of [
      [formatted.owner, 6],
      [formatted.group, 3],
      [formatted.other, 0],
    ] as const) {
      assert.equal(bits.read, (mode & (0o4 << shift)) !== 0);
      assert.equal(bits.write, (mode & (0o2 << shift)) !== 0);
      assert.equal(bits.execute, (mode & (0o1 << shift)) !== 0);
    }
  }
});

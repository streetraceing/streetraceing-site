import assert from 'node:assert/strict';
import test from 'node:test';

import { SemVerError, compareSemVer, sortSemVers } from '../utils/semver';

test('SemVer precedence follows the specification release and prerelease ordering', () => {
  const versions = [
    '1.0.0-alpha',
    '1.0.0-alpha.1',
    '1.0.0-alpha.beta',
    '1.0.0-beta',
    '1.0.0-beta.2',
    '1.0.0-beta.11',
    '1.0.0-rc.1',
    '1.0.0',
    '2.0.0',
    '2.1.0',
    '2.1.1',
  ];
  for (let index = 1; index < versions.length; index++) {
    assert.equal(compareSemVer(versions[index - 1], versions[index]), -1);
    assert.equal(compareSemVer(versions[index], versions[index - 1]), 1);
  }
  assert.deepEqual(sortSemVers([...versions].reverse().join('\n')), versions);
  assert.equal(compareSemVer('0.0.0', '0.0.0'), 0);
  assert.equal(compareSemVer('1.0.0-0', '1.0.0-a'), -1);
  assert.equal(compareSemVer('1.0.0-A', '1.0.0-a'), -1);
  assert.equal(compareSemVer('1.0.0-1', '1.0.0--'), -1);
});

test('integer comparison preserves precision beyond Number and BigInt-sized examples', () => {
  assert.equal(
    compareSemVer('9007199254740992.0.0', '9007199254740993.0.0'),
    -1,
  );
  assert.equal(
    compareSemVer('0.9007199254740993.0', '0.9007199254740992.0'),
    1,
  );
  assert.equal(
    compareSemVer('0.0.9007199254740992', '0.0.9007199254740993'),
    -1,
  );
  assert.equal(
    compareSemVer('1.0.0-9007199254740992', '1.0.0-9007199254740993'),
    -1,
  );
  const huge = '9'.repeat(500);
  assert.equal(compareSemVer(`${huge}.0.0`, `1${'0'.repeat(500)}.0.0`), -1);
  assert.equal(compareSemVer(`1.0.0-${huge}`, `1.0.0-${huge}a`), -1);
});

test('build metadata has no precedence and stable sorting retains every original tag', () => {
  assert.equal(compareSemVer('1.0.0+001', '1.0.0+other.2'), 0);
  assert.equal(compareSemVer('1.0.0-alpha+one', '1.0.0-alpha+two'), 0);
  const source = '2.0.0\r\n1.0.0+z\r\n\r\n1.0.0+a\n0.1.0\r1.0.0+z\n';
  assert.deepEqual(sortSemVers(source), [
    '0.1.0',
    '1.0.0+z',
    '1.0.0+a',
    '1.0.0+z',
    '2.0.0',
  ]);
  assert.deepEqual(sortSemVers(source, true), [
    '2.0.0',
    '1.0.0+z',
    '1.0.0+a',
    '1.0.0+z',
    '0.1.0',
  ]);
  assert.deepEqual(sortSemVers(''), []);
  assert.deepEqual(sortSemVers('\r\n\n'), []);
});

test('SemVer syntax rejects ranges, coercion, leading zeros, invalid identifiers, and whitespace', () => {
  const invalid = [
    '',
    '1',
    '1.2',
    '1.2.3.4',
    'v1.2.3',
    '=1.2.3',
    '^1.2.3',
    '~1.2.3',
    '1.x.0',
    '01.2.3',
    '1.02.3',
    '1.2.03',
    '-1.2.3',
    '1.2.3-',
    '1.2.3+',
    '1.2.3-01',
    '1.2.3-a.01',
    '1.2.3-a..b',
    '1.2.3+a..b',
    '1.2.3-a_',
    '1.2.3+a_',
    '1.2.3+a+b',
    '1.2.3-世界',
    ' 1.2.3',
    '1.2.3 ',
    '1.2.3\n',
    '1.2.3\r\n',
  ];
  for (const value of invalid) {
    assert.throws(() => compareSemVer(value, '1.0.0'), {
      name: 'SemVerError',
      code: 'invalid',
      value,
    });
    assert.throws(() => compareSemVer('1.0.0', value), {
      code: 'invalid',
      value,
    });
  }
  assert.equal(compareSemVer('1.2.3-0a+000.00-a', '1.2.3-0a'), 0);
  assert.throws(() => sortSemVers('1.0.0\n \n2.0.0'), {
    code: 'invalid',
    value: ' ',
  });
  assert.throws(() => sortSemVers('1.0.0\ninvalid'), SemVerError);
});

test('SemVer input, per-version, and count limits are finite with inclusive boundaries', () => {
  const longest = '1.0.0+' + 'a'.repeat(4_090);
  assert.equal(compareSemVer(longest, '1.0.0'), 0);
  assert.throws(() => compareSemVer(longest + 'a', '1.0.0'), { code: 'limit' });
  assert.throws(() => compareSemVer('1.0.0', longest + 'a'), { code: 'limit' });
  assert.throws(() => sortSemVers(longest + 'a'), { code: 'limit' });
  assert.deepEqual(sortSemVers('\n'.repeat(200_000)), []);
  assert.throws(() => sortSemVers('\n'.repeat(200_001)), { code: 'limit' });
  assert.equal(
    sortSemVers(Array(5_000).fill('1.0.0').join('\n')).length,
    5_000,
  );
  assert.throws(() => sortSemVers(Array(5_001).fill('1.0.0').join('\n')), {
    code: 'limit',
  });
});

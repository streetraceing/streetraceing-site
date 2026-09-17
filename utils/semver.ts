export type SemVerErrorCode = 'invalid' | 'limit';

export class SemVerError extends Error {
  readonly code: SemVerErrorCode;
  readonly value?: string;

  constructor(code: SemVerErrorCode, value?: string) {
    super(code);
    this.name = 'SemVerError';
    this.code = code;
    this.value = value;
  }
}

type Comparison = -1 | 0 | 1;
type ParsedSemVer = { core: string[]; prerelease: string[] };

const MAX_INPUT_LENGTH = 200_000;
const MAX_VERSION_LENGTH = 4_096;
const MAX_VERSIONS = 5_000;
const VERSION_PATTERN =
  /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

function isNumeric(identifier: string): boolean {
  return !/[^0-9]/.test(identifier);
}

function parseSemVer(value: string): ParsedSemVer {
  if (value.length > MAX_VERSION_LENGTH) throw new SemVerError('limit');
  const match = VERSION_PATTERN.exec(value);
  // JavaScript's $ may match before a final newline; require the full string.
  if (!match || match[0] !== value) throw new SemVerError('invalid', value);
  const prerelease = match[4] === undefined ? [] : match[4].split('.');
  if (
    prerelease.some(
      (part) => isNumeric(part) && part.length > 1 && part[0] === '0',
    )
  ) {
    throw new SemVerError('invalid', value);
  }
  return { core: [match[1], match[2], match[3]], prerelease };
}

function compareDigits(first: string, second: string): Comparison {
  if (first.length !== second.length)
    return first.length < second.length ? -1 : 1;
  return first === second ? 0 : first < second ? -1 : 1;
}

function compareParsed(first: ParsedSemVer, second: ParsedSemVer): Comparison {
  for (let index = 0; index < 3; index++) {
    const comparison = compareDigits(first.core[index], second.core[index]);
    if (comparison !== 0) return comparison;
  }

  const a = first.prerelease;
  const b = second.prerelease;
  if (a.length === 0 || b.length === 0) {
    return a.length === b.length ? 0 : a.length === 0 ? 1 : -1;
  }
  for (let index = 0; index < Math.min(a.length, b.length); index++) {
    if (a[index] === b[index]) continue;
    const aNumeric = isNumeric(a[index]);
    const bNumeric = isNumeric(b[index]);
    if (aNumeric && bNumeric) return compareDigits(a[index], b[index]);
    if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
    return a[index] < b[index] ? -1 : 1;
  }
  return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
}

export function compareSemVer(first: string, second: string): Comparison {
  return compareParsed(parseSemVer(first), parseSemVer(second));
}

export function sortSemVers(source: string, descending = false): string[] {
  if (source.length > MAX_INPUT_LENGTH) throw new SemVerError('limit');
  // Ignore empty lines, but do not trim invalid whitespace around a version.
  const versions = source.split(/\r\n|[\r\n]/).filter((line) => line !== '');
  if (versions.length > MAX_VERSIONS) throw new SemVerError('limit');
  return versions
    .map((value, index) => ({ value, index, parsed: parseSemVer(value) }))
    .sort((first, second) => {
      const comparison = compareParsed(first.parsed, second.parsed);
      if (comparison === 0) return first.index - second.index;
      return descending ? -comparison : comparison;
    })
    .map(({ value }) => value);
}

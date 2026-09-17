export type Delimiter = ',' | '\t' | ';';

export type CsvErrorCode =
  | 'input-limit'
  | 'output-limit'
  | 'row-limit'
  | 'column-limit'
  | 'invalid-delimiter'
  | 'malformed-quote'
  | 'unterminated-quote'
  | 'missing-header'
  | 'blank-header'
  | 'duplicate-header'
  | 'field-count'
  | 'invalid-json'
  | 'invalid-record'
  | 'nested-value'
  | 'invalid-value';

export class CsvError extends Error {
  readonly code: CsvErrorCode;
  readonly line?: number;

  constructor(code: CsvErrorCode, line?: number) {
    super(code);
    this.name = 'CsvError';
    this.code = code;
    this.line = line;
  }
}

const MAX_INPUT_LENGTH = 200_000;
const MAX_OUTPUT_LENGTH = 2_000_000;
const MAX_ROWS = 5_000;
const MAX_COLUMNS = 100;

function validateInput(source: string, delimiter: Delimiter): void {
  if (source.length > MAX_INPUT_LENGTH) throw new CsvError('input-limit');
  if (delimiter !== ',' && delimiter !== '\t' && delimiter !== ';') {
    throw new CsvError('invalid-delimiter');
  }
}

export function parseDelimited(
  source: string,
  delimiter: Delimiter,
): string[][] {
  validateInput(source, delimiter);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let state: 'start' | 'unquoted' | 'quoted' | 'closed' = 'start';
  let line = 1;
  let quoteLine = 1;
  let rowStarted = false;

  function finishField(): void {
    if (row.length >= MAX_COLUMNS) throw new CsvError('column-limit', line);
    row.push(field);
    field = '';
    state = 'start';
  }

  function finishRow(): void {
    if (rows.length >= MAX_ROWS) throw new CsvError('row-limit', line);
    finishField();
    rows.push(row);
    row = [];
    rowStarted = false;
  }

  // Strip a transport BOM only at the beginning, never inside a field.
  const start = source.charCodeAt(0) === 0xfeff ? 1 : 0;
  for (let index = start; index < source.length; index++) {
    const character = source[index];

    if (state === 'quoted') {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          state = 'closed';
        }
      } else {
        field += character;
        if (character === '\r') {
          if (source[index + 1] === '\n') field += source[++index];
          line++;
        } else if (character === '\n') {
          line++;
        }
      }
      continue;
    }

    if (character === delimiter) {
      finishField();
      rowStarted = true;
    } else if (character === '\r' || character === '\n') {
      finishRow();
      if (character === '\r' && source[index + 1] === '\n') index++;
      line++;
    } else if (character === '"' && state === 'start') {
      state = 'quoted';
      quoteLine = line;
      rowStarted = true;
    } else {
      if (character === '"' || state === 'closed') {
        throw new CsvError('malformed-quote', line);
      }
      state = 'unquoted';
      field += character;
      rowStarted = true;
    }
  }

  if (state === 'quoted') throw new CsvError('unterminated-quote', quoteLine);
  if (rowStarted) finishRow();
  return rows;
}

export function csvToJson(source: string, delimiter: Delimiter): string {
  const [headers, ...rows] = parseDelimited(source, delimiter);
  if (!headers) throw new CsvError('missing-header');

  const seen = new Set<string>();
  for (const header of headers) {
    if (header.trim() === '') throw new CsvError('blank-header', 1);
    if (seen.has(header)) throw new CsvError('duplicate-header', 1);
    seen.add(header);
  }

  const records: string[] = [];
  let outputLength = 2;
  for (const row of rows) {
    if (row.length !== headers.length) throw new CsvError('field-count');
    // A null prototype keeps literal __proto__ and constructor headers as data.
    const record: Record<string, string> = Object.create(null);
    headers.forEach((header, index) => {
      record[header] = row[index];
    });
    const encoded = JSON.stringify(record);
    outputLength += encoded.length + 4;
    // Repeated long headers can otherwise amplify a small CSV into huge JSON.
    if (outputLength > MAX_OUTPUT_LENGTH) throw new CsvError('output-limit');
    records.push(encoded);
  }

  return records.length === 0 ? '[]' : `[\n  ${records.join(',\n  ')}\n]`;
}

function encodeCell(
  value: string,
  delimiter: Delimiter,
  protectFormulas: boolean,
): string {
  // Check through whitespace and invisible controls without changing the cell text.
  if (protectFormulas && /^[\s\p{Cc}\p{Cf}]*[=+\-@\t\r\n]/u.test(value)) {
    value = `'${value}`;
  }
  if (
    value === '' ||
    value.startsWith('\uFEFF') ||
    value.includes(delimiter) ||
    /["\r\n]/.test(value)
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function jsonToCsv(
  source: string,
  delimiter: Delimiter,
  protectFormulas: boolean,
): string {
  validateInput(source, delimiter);
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new CsvError('invalid-json');
  }
  if (!Array.isArray(parsed)) throw new CsvError('invalid-record');
  if (parsed.length === 0) return '';
  // The row budget includes the header in both conversion directions.
  if (parsed.length + 1 > MAX_ROWS) throw new CsvError('row-limit');

  const records: Record<string, unknown>[] = [];
  const keys = new Set<string>();
  for (const entry of parsed as unknown[]) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new CsvError('invalid-record');
    }
    const record = entry as Record<string, unknown>;
    for (const [key, value] of Object.entries(record)) {
      keys.add(key);
      if (keys.size > MAX_COLUMNS) throw new CsvError('column-limit');
      if (value !== null && typeof value === 'object') {
        throw new CsvError('nested-value');
      }
      if (typeof value === 'number' && !Number.isFinite(value)) {
        throw new CsvError('invalid-value');
      }
    }
    records.push(record);
  }
  if (keys.size === 0) throw new CsvError('missing-header');

  const headers = [...keys];
  const lines = [
    headers
      .map((key) => encodeCell(key, delimiter, protectFormulas))
      .join(delimiter),
  ];
  let outputLength = lines[0].length;
  for (const record of records) {
    const line = headers
      .map((key) => {
        const value = Object.prototype.hasOwnProperty.call(record, key)
          ? record[key]
          : null;
        const text =
          value === null ? '' : Object.is(value, -0) ? '-0' : String(value);
        return encodeCell(text, delimiter, protectFormulas);
      })
      .join(delimiter);
    outputLength += line.length + 2;
    if (outputLength > MAX_OUTPUT_LENGTH) throw new CsvError('output-limit');
    lines.push(line);
  }
  return lines.join('\r\n');
}

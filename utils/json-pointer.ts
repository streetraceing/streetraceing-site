export type JsonPointerErrorCode = 'syntax' | 'missing' | 'limit';

export class JsonPointerError extends Error {
  readonly code: JsonPointerErrorCode;

  constructor(code: JsonPointerErrorCode) {
    super(code);
    this.name = 'JsonPointerError';
    this.code = code;
  }
}

const MAX_POINTER_LENGTH = 4_096;
const MAX_POINTER_DEPTH = 100;

export function resolveJsonPointer(value: unknown, pointer: string): unknown {
  if (pointer.length > MAX_POINTER_LENGTH) throw new JsonPointerError('limit');
  if (pointer === '') return value;
  if (!pointer.startsWith('/')) throw new JsonPointerError('syntax');

  const tokens = pointer.slice(1).split('/');
  if (tokens.length > MAX_POINTER_DEPTH) throw new JsonPointerError('limit');
  // Validate the entire pointer before traversal, including unreachable tokens.
  const keys = tokens.map((token) => {
    if (/~(?:[^01]|$)/.test(token)) throw new JsonPointerError('syntax');
    return token.replace(/~[01]/g, (escape) => (escape === '~0' ? '~' : '/'));
  });

  let current = value;
  for (const key of keys) {
    if (current === null || typeof current !== 'object') {
      throw new JsonPointerError('missing');
    }
    if (Array.isArray(current)) {
      if (
        key === '' ||
        /[^0-9]/.test(key) ||
        (key.length > 1 && key[0] === '0')
      ) {
        throw new JsonPointerError('syntax');
      }
      const index = Number(key);
      if (!Number.isSafeInteger(index) || index >= current.length) {
        throw new JsonPointerError('missing');
      }
    }
    const property = Object.getOwnPropertyDescriptor(current, key);
    // JSON has data properties only; do not invoke getters on arbitrary inputs.
    if (!property || !Object.prototype.hasOwnProperty.call(property, 'value')) {
      throw new JsonPointerError('missing');
    }
    current = property.value;
  }
  return current;
}

const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;
const NON_NEGATIVE_INTEGER_PATTERN = /^\d+$/;

export function parsePositiveInteger(
  value: string | null | undefined,
  fallback: number,
  maximum = Number.MAX_SAFE_INTEGER,
) {
  if (!value || !POSITIVE_INTEGER_PATTERN.test(value)) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed <= maximum ? parsed : fallback;
}

export function parseNonNegativeInteger(
  value: unknown,
  fallback: number,
  maximum = Number.MAX_SAFE_INTEGER,
) {
  const normalized = typeof value === 'number' ? String(value) : value;

  if (
    typeof normalized !== 'string' ||
    !NON_NEGATIVE_INTEGER_PATTERN.test(normalized)
  ) {
    return fallback;
  }

  const parsed = Number(normalized);

  return Number.isSafeInteger(parsed) && parsed <= maximum ? parsed : fallback;
}

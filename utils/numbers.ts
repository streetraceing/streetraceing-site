const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;

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

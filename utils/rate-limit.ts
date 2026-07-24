type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

const MAX_RATE_LIMIT_ENTRIES = 20_000;
const RATE_LIMIT_TRIM_TARGET = 18_000;

const globalForRateLimit = globalThis as typeof globalThis & {
  streetraceingRateLimits?: Map<string, RateLimitEntry>;
  streetraceingRateLimitChecks?: number;
};

const entries =
  globalForRateLimit.streetraceingRateLimits ??
  new Map<string, RateLimitEntry>();

globalForRateLimit.streetraceingRateLimits = entries;

function cleanupExpiredEntries(now: number) {
  const checks = (globalForRateLimit.streetraceingRateLimitChecks ?? 0) + 1;
  globalForRateLimit.streetraceingRateLimitChecks = checks;

  if (checks % 100 !== 0 && entries.size < 10_000) {
    return;
  }

  for (const [key, entry] of entries) {
    if (entry.resetAt <= now) {
      entries.delete(key);
    }
  }

  if (entries.size <= MAX_RATE_LIMIT_ENTRIES) {
    return;
  }

  const entriesByReset = [...entries.entries()].sort(
    ([, first], [, second]) => first.resetAt - second.resetAt,
  );

  for (const [key] of entriesByReset) {
    entries.delete(key);

    if (entries.size <= RATE_LIMIT_TRIM_TARGET) {
      break;
    }
  }
}

export function checkRateLimit({
  key,
  limit,
  windowMs,
  now = Date.now(),
}: RateLimitOptions): RateLimitResult {
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new RangeError('Rate limit must be a positive safe integer.');
  }

  if (!Number.isSafeInteger(windowMs) || windowMs < 1) {
    throw new RangeError('Rate limit window must be a positive safe integer.');
  }

  cleanupExpiredEntries(now);

  const current = entries.get(key);
  const entry =
    !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;

  entry.count += 1;
  entries.set(key, entry);

  const allowed = entry.count <= limit;
  const remaining = Math.max(0, limit - entry.count);

  return {
    allowed,
    limit,
    remaining,
    resetAt: entry.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1_000)),
  };
}

export function resetRateLimit(key: string) {
  entries.delete(key);
}

export function getClientAddress(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const address =
    forwardedFor?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown';

  return address.slice(0, 128);
}

export function getRateLimitHeaders(result: RateLimitResult) {
  return {
    'RateLimit-Limit': String(result.limit),
    'RateLimit-Remaining': String(result.remaining),
    'RateLimit-Reset': String(Math.ceil(result.resetAt / 1_000)),
    ...(result.allowed
      ? {}
      : { 'Retry-After': String(result.retryAfterSeconds) }),
  };
}

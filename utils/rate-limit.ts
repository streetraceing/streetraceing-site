import { isIP } from 'node:net';

import { eq, lte, sql } from 'drizzle-orm';

import { db } from '@/db';
import { rateLimitWindows } from '@/db/schema';

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
const DATABASE_CLEANUP_INTERVAL = 100;
const DATABASE_CLEANUP_GRACE_MS = 24 * 60 * 60 * 1_000;

const globalForRateLimit = globalThis as typeof globalThis & {
  streetraceingRateLimits?: Map<string, RateLimitEntry>;
  streetraceingRateLimitChecks?: number;
  streetraceingDatabaseRateLimitChecks?: number;
  streetraceingRateLimitFallbackLoggedAt?: number;
};

const entries =
  globalForRateLimit.streetraceingRateLimits ??
  new Map<string, RateLimitEntry>();

globalForRateLimit.streetraceingRateLimits = entries;

function validateOptions({ key, limit, windowMs }: RateLimitOptions) {
  if (!key || key.length > 191) {
    throw new RangeError('Rate limit key must contain 1 to 191 characters.');
  }

  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new RangeError('Rate limit must be a positive safe integer.');
  }

  if (!Number.isSafeInteger(windowMs) || windowMs < 1) {
    throw new RangeError('Rate limit window must be a positive safe integer.');
  }
}

function createRateLimitResult(
  count: number,
  resetAt: number,
  limit: number,
  now: number,
): RateLimitResult {
  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1_000)),
  };
}

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

export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  validateOptions(options);

  const { key, limit, windowMs, now = Date.now() } = options;

  cleanupExpiredEntries(now);

  const current = entries.get(key);
  const entry =
    !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;

  entry.count += 1;
  entries.set(key, entry);

  return createRateLimitResult(entry.count, entry.resetAt, limit, now);
}

async function checkDatabaseRateLimit({
  key,
  limit,
  windowMs,
  now = Date.now(),
}: RateLimitOptions) {
  const nextResetAt = new Date(now + windowMs);

  const result = await db.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtext(${key}))`,
    );

    const [current] = await transaction
      .select({
        count: rateLimitWindows.count,
        resetAt: rateLimitWindows.resetAt,
      })
      .from(rateLimitWindows)
      .where(eq(rateLimitWindows.key, key))
      .limit(1);

    if (!current || current.resetAt.getTime() <= now) {
      await transaction
        .insert(rateLimitWindows)
        .values({ key, count: 1, resetAt: nextResetAt })
        .onConflictDoUpdate({
          target: rateLimitWindows.key,
          set: { count: 1, resetAt: nextResetAt },
        });

      return createRateLimitResult(1, nextResetAt.getTime(), limit, now);
    }

    const count = current.count + 1;

    await transaction
      .update(rateLimitWindows)
      .set({ count })
      .where(eq(rateLimitWindows.key, key));

    return createRateLimitResult(count, current.resetAt.getTime(), limit, now);
  });

  const checks =
    (globalForRateLimit.streetraceingDatabaseRateLimitChecks ?? 0) + 1;
  globalForRateLimit.streetraceingDatabaseRateLimitChecks = checks;

  if (checks % DATABASE_CLEANUP_INTERVAL === 0) {
    try {
      await cleanupExpiredRateLimits(new Date(now - DATABASE_CLEANUP_GRACE_MS));
    } catch (error) {
      logDatabaseFallback(error);
    }
  }

  return result;
}

function logDatabaseFallback(error: unknown) {
  const now = Date.now();
  const lastLoggedAt =
    globalForRateLimit.streetraceingRateLimitFallbackLoggedAt ?? 0;

  if (now - lastLoggedAt < 60_000) {
    return;
  }

  globalForRateLimit.streetraceingRateLimitFallbackLoggedAt = now;
  console.error(
    'Could not use the shared database rate limiter; falling back to process-local protection.',
    error,
  );
}

export async function checkDurableRateLimit(
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  validateOptions(options);

  if (!process.env.DATABASE_URL) {
    return checkRateLimit(options);
  }

  try {
    return await checkDatabaseRateLimit(options);
  } catch (error) {
    logDatabaseFallback(error);
    return checkRateLimit(options);
  }
}

export function resetRateLimit(key: string) {
  entries.delete(key);
}

export async function resetDurableRateLimit(key: string) {
  resetRateLimit(key);

  if (!process.env.DATABASE_URL) {
    return;
  }

  try {
    await db.delete(rateLimitWindows).where(eq(rateLimitWindows.key, key));
  } catch (error) {
    logDatabaseFallback(error);
  }
}

export async function cleanupExpiredRateLimits(
  threshold = new Date(),
): Promise<number> {
  if (!process.env.DATABASE_URL) {
    return 0;
  }

  const deletedRows = await db
    .delete(rateLimitWindows)
    .where(lte(rateLimitWindows.resetAt, threshold))
    .returning({ key: rateLimitWindows.key });

  return deletedRows.length;
}

function normalizeIpAddress(value: string | undefined) {
  const firstValue = value?.split(',')[0]?.trim();

  if (!firstValue) {
    return undefined;
  }

  const bracketedIpv6 = firstValue.match(/^\[([^\]]+)](?::\d+)?$/)?.[1];
  const ipv4WithPort = firstValue.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/)?.[1];
  const address = bracketedIpv6 ?? ipv4WithPort ?? firstValue;

  return isIP(address) ? address.toLowerCase() : undefined;
}

function getTrustedProxyHeaderName() {
  const headerName = process.env.TRUSTED_PROXY_IP_HEADER?.trim().toLowerCase();

  return headerName && /^[a-z0-9-]+$/.test(headerName) ? headerName : undefined;
}

export function getClientAddress(request: Request) {
  const trustedProxyHeader = getTrustedProxyHeaderName();
  const headerValue = process.env.VERCEL
    ? request.headers.get('x-vercel-forwarded-for')
    : trustedProxyHeader
      ? request.headers.get(trustedProxyHeader)
      : undefined;

  return normalizeIpAddress(headerValue ?? undefined) ?? 'unknown';
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

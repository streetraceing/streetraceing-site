import { and, count, desc, eq, gt, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db';
import { shortUrls } from '@/db/schema';
import {
  CODE_PATTERN,
  createOwnerToken,
  createShortCode,
  createTinyUrlPreview,
  getTinyUrlExpirationDate,
  getTinyUrlRetentionThreshold,
  MAX_CONTENT_LENGTH,
  MAX_OWNER_ITEMS,
  OWNER_TOKEN_PATTERN,
  TINY_URL_OWNER_COOKIE,
  TINY_URL_PREVIEW_LENGTH,
} from '@/lib/tiny-url';
import { getLocaleTag, getRequestLocale, translations } from '@/utils/i18n';
import {
  checkDurableRateLimit,
  getClientAddress,
  getRateLimitHeaders,
} from '@/utils/rate-limit';

export const runtime = 'nodejs';

const CREATE_RATE_LIMIT = 20;
const CREATE_RATE_WINDOW_MS = 60 * 60 * 1_000;
const DELETE_RATE_LIMIT = 60;
const DELETE_RATE_WINDOW_MS = 60 * 60 * 1_000;
const MAX_REQUEST_BYTES = MAX_CONTENT_LENGTH * 4 + 1_024;

function getContent(value: unknown) {
  if (
    typeof value !== 'string' ||
    value.length > MAX_CONTENT_LENGTH ||
    value.trim().length === 0
  ) {
    return undefined;
  }

  return value;
}

function getOwnerToken(request: NextRequest) {
  const value = request.cookies.get(TINY_URL_OWNER_COOKIE)?.value;
  return value && OWNER_TOKEN_PATTERN.test(value) ? value : undefined;
}

function getShortUrl(code: string, request: NextRequest) {
  return new URL(`/${code}`, request.nextUrl.origin).toString();
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  );
}

function noStoreJson(
  body: unknown,
  init?: ResponseInit,
  additionalHeaders?: Record<string, string>,
) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'no-store');

  for (const [name, value] of Object.entries(additionalHeaders ?? {})) {
    response.headers.set(name, value);
  }

  return response;
}

export async function GET(request: NextRequest) {
  const strings = translations[getRequestLocale(request)].api.tinyUrl;
  const ownerToken = getOwnerToken(request);

  if (!ownerToken || !process.env.DATABASE_URL) {
    return noStoreJson({ items: [] });
  }

  const threshold = getTinyUrlRetentionThreshold();

  try {
    const items = await db
      .select({
        code: shortUrls.code,
        preview: sql<string>`left(${shortUrls.content}, ${TINY_URL_PREVIEW_LENGTH + 1})`,
        contentLength: sql<number>`char_length(${shortUrls.content})`,
        createdAt: shortUrls.createdAt,
        visitCount: shortUrls.visitCount,
      })
      .from(shortUrls)
      .where(
        and(
          eq(shortUrls.ownerToken, ownerToken),
          gt(shortUrls.createdAt, threshold),
        ),
      )
      .orderBy(desc(shortUrls.createdAt))
      .limit(MAX_OWNER_ITEMS);

    return noStoreJson({
      items: items.map((item) => ({
        ...item,
        preview: createTinyUrlPreview(item.preview),
        shortUrl: getShortUrl(item.code, request),
        expiresAt: getTinyUrlExpirationDate(item.createdAt),
      })),
    });
  } catch {
    return noStoreJson({ error: strings.loadFailed }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const locale = getRequestLocale(request);
  const strings = translations[locale].api.tinyUrl;
  const rateLimit = await checkDurableRateLimit({
    key: `tiny-url:create:${getClientAddress(request)}`,
    limit: CREATE_RATE_LIMIT,
    windowMs: CREATE_RATE_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    return noStoreJson(
      { error: strings.rateLimited },
      { status: 429 },
      getRateLimitHeaders(rateLimit),
    );
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');

  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return noStoreJson(
      {
        error: strings.contentTooLong.replace(
          '{count}',
          MAX_CONTENT_LENGTH.toLocaleString(getLocaleTag(locale)),
        ),
      },
      { status: 413 },
      getRateLimitHeaders(rateLimit),
    );
  }

  let body: { content?: unknown };

  try {
    body = (await request.json()) as { content?: unknown };
  } catch {
    return noStoreJson(
      { error: strings.invalidJson },
      { status: 400 },
      getRateLimitHeaders(rateLimit),
    );
  }

  const content = getContent(body.content);
  if (!content) {
    return noStoreJson(
      {
        error: strings.contentTooLong.replace(
          '{count}',
          MAX_CONTENT_LENGTH.toLocaleString(getLocaleTag(locale)),
        ),
      },
      { status: 400 },
      getRateLimitHeaders(rateLimit),
    );
  }

  if (!process.env.DATABASE_URL) {
    return noStoreJson(
      { error: strings.databaseMissing },
      { status: 503 },
      getRateLimitHeaders(rateLimit),
    );
  }

  const storedOwnerToken = getOwnerToken(request);
  const ownerToken = storedOwnerToken ?? createOwnerToken();
  const threshold = getTinyUrlRetentionThreshold();

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const result = await db.transaction(async (transaction) => {
          await transaction.execute(
            sql`select pg_advisory_xact_lock(hashtext(${ownerToken}))`,
          );
          const [ownerCount] = await transaction
            .select({ total: count() })
            .from(shortUrls)
            .where(
              and(
                eq(shortUrls.ownerToken, ownerToken),
                gt(shortUrls.createdAt, threshold),
              ),
            );

          if ((ownerCount?.total ?? 0) >= MAX_OWNER_ITEMS) {
            return { quotaExceeded: true as const };
          }

          const [item] = await transaction
            .insert(shortUrls)
            .values({ code: createShortCode(), content, ownerToken })
            .returning({
              code: shortUrls.code,
              createdAt: shortUrls.createdAt,
              visitCount: shortUrls.visitCount,
            });

          if (!item) {
            throw new Error('Short URL insert returned no row.');
          }

          return { item };
        });

        if ('quotaExceeded' in result) {
          return noStoreJson(
            {
              error: strings.quotaExceeded.replace(
                '{count}',
                String(MAX_OWNER_ITEMS),
              ),
            },
            { status: 409 },
            getRateLimitHeaders(rateLimit),
          );
        }

        const response = noStoreJson(
          {
            item: {
              ...result.item,
              preview: createTinyUrlPreview(content),
              contentLength: content.length,
              shortUrl: getShortUrl(result.item.code, request),
              expiresAt: getTinyUrlExpirationDate(result.item.createdAt),
            },
          },
          { status: 201 },
          getRateLimitHeaders(rateLimit),
        );

        if (!storedOwnerToken) {
          response.cookies.set(TINY_URL_OWNER_COOKIE, ownerToken, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 60 * 60 * 24 * 365,
          });
        }

        return response;
      } catch (error) {
        if (isUniqueViolation(error)) {
          continue;
        }

        throw error;
      }
    }
  } catch {
    return noStoreJson(
      { error: strings.saveFailed },
      { status: 500 },
      getRateLimitHeaders(rateLimit),
    );
  }

  return noStoreJson(
    { error: strings.codeGenerationFailed },
    { status: 500 },
    getRateLimitHeaders(rateLimit),
  );
}

export async function DELETE(request: NextRequest) {
  const strings = translations[getRequestLocale(request)].api.tinyUrl;
  const ownerToken = getOwnerToken(request);
  const code = request.nextUrl.searchParams.get('code') ?? '';
  const rateLimit = await checkDurableRateLimit({
    key: `tiny-url:delete:${getClientAddress(request)}`,
    limit: DELETE_RATE_LIMIT,
    windowMs: DELETE_RATE_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    return noStoreJson(
      { error: strings.rateLimited },
      { status: 429 },
      getRateLimitHeaders(rateLimit),
    );
  }

  if (!process.env.DATABASE_URL) {
    return noStoreJson(
      { error: strings.databaseMissing },
      { status: 503 },
      getRateLimitHeaders(rateLimit),
    );
  }

  if (!ownerToken || !CODE_PATTERN.test(code)) {
    return noStoreJson(
      { error: strings.notFound },
      { status: 404 },
      getRateLimitHeaders(rateLimit),
    );
  }

  try {
    const [deleted] = await db
      .delete(shortUrls)
      .where(
        and(eq(shortUrls.code, code), eq(shortUrls.ownerToken, ownerToken)),
      )
      .returning({ code: shortUrls.code });

    if (!deleted) {
      return noStoreJson(
        { error: strings.notFound },
        { status: 404 },
        getRateLimitHeaders(rateLimit),
      );
    }

    return noStoreJson(
      { code: deleted.code },
      undefined,
      getRateLimitHeaders(rateLimit),
    );
  } catch {
    return noStoreJson(
      { error: strings.deleteFailed },
      { status: 500 },
      getRateLimitHeaders(rateLimit),
    );
  }
}

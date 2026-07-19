import { db } from '@/db';
import { shortUrls } from '@/db/schema';
import {
  createOwnerToken,
  createShortCode,
  MAX_CONTENT_LENGTH,
  TINY_URL_OWNER_COOKIE,
} from '@/lib/tiny-url';
import { getLocaleTag, getRequestLocale, translations } from '@/utils/i18n';
import { desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

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

function toResponseItem(
  item: {
    code: string;
    content: string;
    createdAt: Date;
    visitCount: number;
  },
  request: NextRequest,
) {
  return {
    ...item,
    shortUrl: new URL(`/${item.code}`, request.nextUrl.origin).toString(),
  };
}

export async function GET(request: NextRequest) {
  const strings = translations[getRequestLocale(request)].api.tinyUrl;
  const ownerToken = request.cookies.get(TINY_URL_OWNER_COOKIE)?.value;

  if (!ownerToken || !process.env.DATABASE_URL) {
    return NextResponse.json({ items: [] });
  }

  try {
    const items = await db
      .select({
        code: shortUrls.code,
        content: shortUrls.content,
        createdAt: shortUrls.createdAt,
        visitCount: shortUrls.visitCount,
      })
      .from(shortUrls)
      .where(eq(shortUrls.ownerToken, ownerToken))
      .orderBy(desc(shortUrls.createdAt))
      .limit(50);

    return NextResponse.json({
      items: items.map((item) => toResponseItem(item, request)),
    });
  } catch {
    return NextResponse.json({ error: strings.loadFailed }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const locale = getRequestLocale(request);
  const strings = translations[locale].api.tinyUrl;
  let body: { content?: unknown };

  try {
    body = (await request.json()) as { content?: unknown };
  } catch {
    return NextResponse.json({ error: strings.invalidJson }, { status: 400 });
  }

  const content = getContent(body.content);
  if (!content) {
    return NextResponse.json(
      {
        error: strings.contentTooLong.replace(
          '{count}',
          MAX_CONTENT_LENGTH.toLocaleString(getLocaleTag(locale)),
        ),
      },
      { status: 400 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: strings.databaseMissing },
      { status: 503 },
    );
  }

  const storedOwnerToken = request.cookies.get(TINY_URL_OWNER_COOKIE)?.value;
  const ownerToken = storedOwnerToken ?? createOwnerToken();

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const [item] = await db
          .insert(shortUrls)
          .values({ code: createShortCode(), content, ownerToken })
          .returning({
            code: shortUrls.code,
            content: shortUrls.content,
            createdAt: shortUrls.createdAt,
            visitCount: shortUrls.visitCount,
          });

        const response = NextResponse.json(
          { item: toResponseItem(item, request) },
          { status: 201 },
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
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === '23505'
        ) {
          continue;
        }

        throw error;
      }
    }
  } catch {
    return NextResponse.json({ error: strings.saveFailed }, { status: 500 });
  }

  return NextResponse.json(
    { error: strings.codeGenerationFailed },
    { status: 500 },
  );
}

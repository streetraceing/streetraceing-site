import { createHash, timingSafeEqual } from 'node:crypto';

import { lte } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { shortUrls } from '@/db/schema';
import { cleanupExpiredPendingMediaUploads } from '@/lib/pending-media-uploads';
import { getTinyUrlRetentionThreshold } from '@/lib/tiny-url';
import { cleanupExpiredRateLimits } from '@/utils/rate-limit';

export const runtime = 'nodejs';

const MIN_CRON_SECRET_LENGTH = 32;

function safeEqual(first: string, second: string) {
  const firstHash = createHash('sha256').update(first).digest();
  const secondHash = createHash('sha256').update(second).digest();

  return timingSafeEqual(firstHash, secondHash);
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || cronSecret.length < MIN_CRON_SECRET_LENGTH) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured.' },
      { status: 503 },
    );
  }

  if (
    !safeEqual(
      request.headers.get('authorization') ?? '',
      `Bearer ${cronSecret}`,
    )
  ) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'DATABASE_URL is not configured.' },
      { status: 503 },
    );
  }

  try {
    const deletedRows = await db
      .delete(shortUrls)
      .where(lte(shortUrls.createdAt, getTinyUrlRetentionThreshold()))
      .returning({ id: shortUrls.id });
    const [pendingMedia, expiredRateLimits] = await Promise.all([
      cleanupExpiredPendingMediaUploads(),
      cleanupExpiredRateLimits(),
    ]);

    return NextResponse.json({
      deleted: deletedRows.length,
      pendingMedia,
      expiredRateLimits,
    });
  } catch (error) {
    console.error('Could not complete scheduled maintenance.', error);
    return NextResponse.json(
      { error: 'Could not complete scheduled maintenance.' },
      { status: 500 },
    );
  }
}

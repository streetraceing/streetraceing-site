import { createHash, timingSafeEqual } from 'node:crypto';
import { lte } from 'drizzle-orm';

import { db } from '@/db';
import { shortUrls } from '@/db/schema';
import { noStoreJson, requireDatabase } from '@/lib/api-response';
import { cleanupExpiredPendingMediaUploads } from '@/lib/pending-media-uploads';
import {
  cleanupExpiredTempChats,
  cleanupTempChatUploads,
} from '@/lib/temp-chat-uploads';
import { getTinyUrlRetentionThreshold } from '@/lib/tiny-url';
import { cleanupExpiredRateLimits } from '@/utils/rate-limit';

export const runtime = 'nodejs';
const MIN_CRON_SECRET_LENGTH = 32;

function safeEqual(first: string, second: string) {
  return timingSafeEqual(
    createHash('sha256').update(first).digest(),
    createHash('sha256').update(second).digest(),
  );
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < MIN_CRON_SECRET_LENGTH) {
    return noStoreJson(
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
    return noStoreJson({ error: 'Unauthorized.' }, { status: 401 });
  }
  const guard = requireDatabase('DATABASE_URL is not configured.');
  if (guard) return guard;
  const cutoff = new Date();
  // Each maintenance branch runs even if another provider/database operation fails.
  const results = await Promise.allSettled([
    db
      .delete(shortUrls)
      .where(lte(shortUrls.createdAt, getTinyUrlRetentionThreshold(cutoff)))
      .returning({ id: shortUrls.id })
      .then((rows) => ({ deleted: rows.length })),
    cleanupExpiredPendingMediaUploads(),
    cleanupExpiredRateLimits(),
    cleanupExpiredTempChats(cutoff),
    cleanupTempChatUploads(cutoff),
  ]);
  const names = [
    'shortUrls',
    'pendingMedia',
    'expiredRateLimits',
    'tempChats',
    'tempChatUploads',
  ];
  const failed = results.some((result) => result.status === 'rejected');
  return noStoreJson(
    Object.fromEntries(
      results.map((result, index) => [
        names[index],
        result.status === 'fulfilled' ? result.value : { failed: true },
      ]),
    ),
    { status: failed ? 500 : 200 },
  );
}

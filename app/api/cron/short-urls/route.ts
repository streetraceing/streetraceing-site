import { createHash, timingSafeEqual } from 'node:crypto';

import { lte, inArray } from 'drizzle-orm';

import { db } from '@/db';
import { shortUrls, tempChatMessages, tempChats } from '@/db/schema';
import { noStoreJson, requireDatabase } from '@/lib/api-response';
import { deleteCloudinaryPublicIds } from '@/lib/cloudinary-media';
import { deleteR2Objects } from '@/lib/r2';
import { isTempChatResourceType } from '@/lib/temp-chat';
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

  const databaseGuard = requireDatabase('DATABASE_URL is not configured.');
  if (databaseGuard) {
    return databaseGuard;
  }

  try {
    const expiredChats = await db
      .select({ id: tempChats.id })
      .from(tempChats)
      .where(lte(tempChats.expiresAt, new Date()));
    const expiredChatIds = expiredChats.map((chat) => chat.id);
    const expiredChatKeys =
      expiredChatIds.length > 0
        ? await db
            .select({
              fileProvider: tempChatMessages.fileProvider,
              filePath: tempChatMessages.filePath,
              fileResourceType: tempChatMessages.fileResourceType,
            })
            .from(tempChatMessages)
            .where(inArray(tempChatMessages.chatId, expiredChatIds))
        : [];
    const cloudinaryEntries = expiredChatKeys.flatMap((row) => {
      if (
        row.fileProvider === 'r2' ||
        !row.filePath ||
        !isTempChatResourceType(row.fileResourceType)
      ) {
        return [];
      }

      return [{ publicId: row.filePath, resourceType: row.fileResourceType }];
    });
    const r2Keys = expiredChatKeys
      .filter((row) => row.fileProvider === 'r2' && Boolean(row.filePath))
      .map((row) => row.filePath as string);
    const chatFileResults = await Promise.all([
      cloudinaryEntries.length > 0
        ? deleteCloudinaryPublicIds(cloudinaryEntries)
        : Promise.resolve({ failed: 0 }),
      r2Keys.length > 0
        ? deleteR2Objects(r2Keys)
        : Promise.resolve({ failed: 0 }),
    ]);
    const chatFilesFailed =
      chatFileResults[0].failed + chatFileResults[1].failed;
    const deletedChatRows =
      expiredChatIds.length > 0
        ? await db
            .delete(tempChats)
            .where(lte(tempChats.expiresAt, new Date()))
            .returning({ id: tempChats.id })
        : [];

    const deletedRows = await db
      .delete(shortUrls)
      .where(lte(shortUrls.createdAt, getTinyUrlRetentionThreshold()))
      .returning({ id: shortUrls.id });
    const [pendingMedia, expiredRateLimits] = await Promise.all([
      cleanupExpiredPendingMediaUploads(),
      cleanupExpiredRateLimits(),
    ]);

    return noStoreJson({
      deleted: deletedRows.length,
      pendingMedia,
      expiredRateLimits,
      tempChats: {
        deleted: deletedChatRows.length,
        filesFailed: chatFilesFailed,
      },
    });
  } catch (error) {
    console.error('Could not complete scheduled maintenance.', error);
    return noStoreJson(
      { error: 'Could not complete scheduled maintenance.' },
      { status: 500 },
    );
  }
}

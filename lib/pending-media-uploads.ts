import { inArray, lte } from 'drizzle-orm';

import { db } from '@/db';
import { devUpdates, pendingMediaUploads, projectContents } from '@/db/schema';
import {
  deleteCloudinaryPublicIds,
  type CloudinaryDeleteResult,
} from '@/lib/cloudinary-media';
import { getCloudinaryPublicIdFromUrl } from '@/utils/media';

const PENDING_MEDIA_RETENTION_MS = 24 * 60 * 60 * 1_000;
const PENDING_MEDIA_CLEANUP_LIMIT = 100;

export type PendingMediaCleanupResult = CloudinaryDeleteResult & {
  referenced: number;
};

function getPublicIds(urls: string[]) {
  return [
    ...new Set(
      urls
        .map((url) =>
          getCloudinaryPublicIdFromUrl(url, process.env.CLOUDINARY_CLOUD_NAME),
        )
        .filter((publicId): publicId is string => Boolean(publicId)),
    ),
  ];
}

async function readReferencedPublicIds(
  executor: Pick<typeof db, 'select'> = db,
) {
  const [updates, projects] = await Promise.all([
    executor.select({ imageUrls: devUpdates.imageUrls }).from(devUpdates),
    executor
      .select({ imageUrls: projectContents.imageUrls })
      .from(projectContents),
  ]);

  return new Set(
    [...updates, ...projects]
      .flatMap((row) => row.imageUrls)
      .map((url) =>
        getCloudinaryPublicIdFromUrl(url, process.env.CLOUDINARY_CLOUD_NAME),
      )
      .filter((publicId): publicId is string => Boolean(publicId)),
  );
}

async function removePendingRows(
  publicIds: string[],
  executor: Pick<typeof db, 'delete'> = db,
) {
  if (publicIds.length === 0) {
    return;
  }

  await executor
    .delete(pendingMediaUploads)
    .where(inArray(pendingMediaUploads.publicId, publicIds));
}

async function cleanupPendingPublicIds(
  pendingPublicIds: string[],
): Promise<PendingMediaCleanupResult> {
  if (pendingPublicIds.length === 0) {
    return {
      requested: 0,
      deleted: 0,
      notFound: 0,
      failed: 0,
      referenced: 0,
    };
  }

  const referencedPublicIds = await readReferencedPublicIds();
  const referenced = pendingPublicIds.filter((publicId) =>
    referencedPublicIds.has(publicId),
  );
  const unreferenced = pendingPublicIds.filter(
    (publicId) => !referencedPublicIds.has(publicId),
  );

  await removePendingRows(referenced);

  const { completedPublicIds, ...deleteResult } =
    await deleteCloudinaryPublicIds(
      unreferenced.map((publicId) => ({
        publicId,
        resourceType: 'image' as const,
      })),
    );

  await removePendingRows(completedPublicIds);

  return {
    ...deleteResult,
    requested: pendingPublicIds.length,
    referenced: referenced.length,
  };
}

export async function registerPendingMediaUpload(publicId: string) {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured.');
  }

  await db.insert(pendingMediaUploads).values({ publicId });
}

/** Use the owning mutation's transaction so inventory and reference removal commit together. */
export async function registerRemovedMediaUploads(
  urls: string[],
  executor: Pick<typeof db, 'insert'> = db,
) {
  const publicIds = getPublicIds(urls).sort();
  if (publicIds.length === 0) {
    return;
  }

  const createdAt = new Date();
  await executor
    .insert(pendingMediaUploads)
    .values(publicIds.map((publicId) => ({ publicId, createdAt })))
    .onConflictDoUpdate({
      target: pendingMediaUploads.publicId,
      set: { createdAt },
    });
}

export async function confirmPendingMediaUploads(urls: string[]) {
  if (!process.env.DATABASE_URL) {
    return;
  }

  const publicIds = getPublicIds(urls);
  if (publicIds.length === 0) {
    return;
  }

  await db.transaction(async (tx) => {
    // A delayed confirmation must not remove inventory re-queued by a newer save.
    const pending = await tx
      .select({ publicId: pendingMediaUploads.publicId })
      .from(pendingMediaUploads)
      .where(inArray(pendingMediaUploads.publicId, publicIds))
      .orderBy(pendingMediaUploads.publicId)
      .for('update');
    const referenced = await readReferencedPublicIds(tx);
    await removePendingRows(
      pending.map((row) => row.publicId).filter((id) => referenced.has(id)),
      tx,
    );
  });
}

export async function discardPendingMediaUploads(
  urls: string[],
): Promise<PendingMediaCleanupResult> {
  const publicIds = getPublicIds(urls);
  const failedResult: PendingMediaCleanupResult = {
    requested: publicIds.length,
    deleted: 0,
    notFound: 0,
    failed: publicIds.length,
    referenced: 0,
  };

  if (!process.env.DATABASE_URL) {
    return failedResult;
  }

  if (publicIds.length === 0) {
    return cleanupPendingPublicIds([]);
  }

  try {
    const pendingRows = await db
      .select({ publicId: pendingMediaUploads.publicId })
      .from(pendingMediaUploads)
      .where(inArray(pendingMediaUploads.publicId, publicIds));

    return await cleanupPendingPublicIds(
      pendingRows.map((row) => row.publicId),
    );
  } catch (error) {
    console.error('Could not clean up pending media uploads.', error);
    return failedResult;
  }
}

export async function cleanupExpiredPendingMediaUploads(
  now = new Date(),
): Promise<PendingMediaCleanupResult> {
  if (!process.env.DATABASE_URL) {
    return {
      requested: 0,
      deleted: 0,
      notFound: 0,
      failed: 0,
      referenced: 0,
    };
  }

  const threshold = new Date(now.getTime() - PENDING_MEDIA_RETENTION_MS);
  const pendingRows = await db
    .select({ publicId: pendingMediaUploads.publicId })
    .from(pendingMediaUploads)
    .where(lte(pendingMediaUploads.createdAt, threshold))
    .limit(PENDING_MEDIA_CLEANUP_LIMIT);

  return cleanupPendingPublicIds(pendingRows.map((row) => row.publicId));
}

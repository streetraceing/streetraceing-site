import { and, asc, eq, gt, inArray, lte, sql } from 'drizzle-orm';

import { db } from '@/db';
import { tempChatMessages, tempChats, tempChatUploads } from '@/db/schema';
import {
  deleteCloudinaryPublicIds,
  getCloudinaryConfig,
} from '@/lib/cloudinary-media';
import { deleteR2Objects, getR2ObjectMetadata } from '@/lib/r2';
import { isJsonObject, readJsonResponse } from '@/utils/json';
import {
  getTempChatPublicIdFromUrl,
  isTempChatUploadAttachable,
  TEMP_CHAT_MAX_FILE_BYTES,
  TEMP_CHAT_PENDING_UPLOAD_RETENTION_MS,
  TEMP_CHAT_RESOURCE_TYPES,
  type TempChatAttachmentRequest,
  type TempChatMessageAttachment,
} from '@/utils/temp-chat';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export class InvalidTempChatUpload extends Error {}

/** Serialize authorization, saves and deletion against the room lifecycle. */
export async function lockActiveTempChat(tx: Transaction, chatId: string) {
  const [chat] = await tx
    .select()
    .from(tempChats)
    .where(and(eq(tempChats.id, chatId), gt(tempChats.expiresAt, new Date())))
    .for('update');
  if (!chat || chat.expiresAt.getTime() <= Date.now()) {
    throw new InvalidTempChatUpload('Room is no longer active.');
  }
  return chat;
}

export async function registerTempChatUpload(
  upload: Pick<
    typeof tempChatUploads.$inferInsert,
    'chatId' | 'memberId' | 'provider' | 'path' | 'name' | 'type' | 'size'
  >,
) {
  await db.transaction(async (tx) => {
    await lockActiveTempChat(tx, upload.chatId);
    await tx.insert(tempChatUploads).values({
      ...upload,
      // Cloudinary signatures outlive our nominal five-minute upload UI.
      cleanupAfter: new Date(
        Date.now() + TEMP_CHAT_PENDING_UPLOAD_RETENTION_MS,
      ),
    });
  });
}

/** Verify against provider metadata, never the browser's upload response. */
export async function verifyTempChatAttachments(
  chatId: string,
  memberId: string,
  attachments: TempChatAttachmentRequest[],
): Promise<TempChatMessageAttachment[]> {
  const verified: TempChatMessageAttachment[] = [];
  const seen = new Set<string>();
  for (const attachment of attachments) {
    const identity = `${attachment.provider}:${attachment.path}`;
    if (seen.has(identity))
      throw new InvalidTempChatUpload('Duplicate upload.');
    seen.add(identity);
    const [registered] = await db
      .select()
      .from(tempChatUploads)
      .where(
        and(
          eq(tempChatUploads.chatId, chatId),
          eq(tempChatUploads.memberId, memberId),
          eq(tempChatUploads.provider, attachment.provider),
          eq(tempChatUploads.path, attachment.path),
          eq(tempChatUploads.status, 'pending'),
          gt(tempChatUploads.cleanupAfter, new Date()),
        ),
      )
      .limit(1);
    if (
      !registered ||
      !isTempChatUploadAttachable(registered, attachment, chatId, memberId)
    ) {
      throw new InvalidTempChatUpload(
        'Upload is not owned or no longer pending.',
      );
    }

    let size: number;
    let url = attachment.url;
    let type = registered.type;
    if (attachment.provider === 'r2') {
      const metadata = await getR2ObjectMetadata(registered.path);
      if (!metadata) throw new InvalidTempChatUpload('Upload is missing.');
      size = metadata.size;
      type = metadata.contentType || 'application/octet-stream';
      // HEAD verifies this revision. A still-valid presigned PUT can overwrite
      // it; immutable PUTs/provider policy are needed for a lasting size cap.
    } else {
      const config = getCloudinaryConfig();
      if (!config) throw new Error('Cloudinary is unavailable.');
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/resources/${attachment.resourceType}/upload/${encodeURIComponent(registered.path)}`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`,
          },
          cache: 'no-store',
          redirect: 'error',
          signal: AbortSignal.timeout(10_000),
        },
      );
      const metadata = await readJsonResponse(response);
      if (
        !response.ok ||
        !isJsonObject(metadata) ||
        metadata.public_id !== registered.path ||
        metadata.resource_type !== attachment.resourceType ||
        typeof metadata.bytes !== 'number' ||
        typeof metadata.secure_url !== 'string' ||
        getTempChatPublicIdFromUrl(
          metadata.secure_url,
          config.cloudName,
          attachment.resourceType,
        ) !== registered.path
      ) {
        throw new InvalidTempChatUpload(
          'Provider could not verify the upload.',
        );
      }
      size = metadata.bytes;
      url = metadata.secure_url;
    }
    if (
      !Number.isSafeInteger(size) ||
      size < 1 ||
      size > TEMP_CHAT_MAX_FILE_BYTES ||
      size !== registered.size ||
      type.length > 128
    ) {
      throw new InvalidTempChatUpload(
        'Provider metadata does not match the authorization.',
      );
    }
    verified.push({ ...attachment, url, type, size });
  }
  return verified;
}

/** Conditional updates in the message transaction make each object single-use. */
export async function consumeTempChatUploads(
  tx: Transaction,
  chatId: string,
  memberId: string,
  messageId: string,
  attachments: TempChatMessageAttachment[],
) {
  for (const attachment of attachments) {
    const rows = await tx
      .update(tempChatUploads)
      .set({ status: 'attached', messageId })
      .where(
        and(
          eq(tempChatUploads.chatId, chatId),
          eq(tempChatUploads.memberId, memberId),
          eq(tempChatUploads.provider, attachment.provider),
          eq(tempChatUploads.path, attachment.path),
          eq(tempChatUploads.status, 'pending'),
          gt(tempChatUploads.cleanupAfter, new Date()),
        ),
      )
      .returning({ id: tempChatUploads.id });
    if (rows.length !== 1)
      throw new InvalidTempChatUpload('Upload was already consumed.');
  }
}

/** Import legacy inventory BEFORE destroying its only message reference. */
export async function enqueueTempChatMessageUploads(
  tx: Transaction,
  message: typeof tempChatMessages.$inferSelect,
) {
  for (const attachment of message.attachments) {
    if (
      (attachment.provider !== 'r2' && attachment.provider !== 'cloudinary') ||
      !attachment.path ||
      attachment.path.length > 255
    ) {
      throw new Error(
        'Invalid legacy attachment inventory; retain the message.',
      );
    }
    await tx
      .insert(tempChatUploads)
      .values({
        chatId: message.chatId,
        memberId: message.memberId,
        provider: attachment.provider,
        path: attachment.path,
        name: attachment.name,
        type: attachment.type,
        size: attachment.size,
        messageId: message.id,
        status: 'deleting',
        cleanupAfter: new Date(
          Date.now() + TEMP_CHAT_PENDING_UPLOAD_RETENTION_MS,
        ),
      })
      .onConflictDoUpdate({
        target: [tempChatUploads.provider, tempChatUploads.path],
        set: { status: 'deleting' },
      });
  }
}

/** Bounded room draining. Failed inventories keep their source messages. */
export async function cleanupExpiredTempChats(cutoff: Date) {
  const chats = await db
    .select({ id: tempChats.id })
    .from(tempChats)
    .where(lte(tempChats.expiresAt, cutoff))
    .orderBy(asc(tempChats.expiresAt), asc(tempChats.id))
    .limit(25);
  let deleted = 0;
  let failed = 0;
  for (const { id } of chats) {
    try {
      deleted += await db.transaction(async (tx) => {
        const [chat] = await tx
          .select({ id: tempChats.id })
          .from(tempChats)
          .where(and(eq(tempChats.id, id), lte(tempChats.expiresAt, cutoff)))
          .for('update');
        if (!chat) return 0;
        const messages = await tx
          .select()
          .from(tempChatMessages)
          .where(eq(tempChatMessages.chatId, id))
          .orderBy(asc(tempChatMessages.createdAt), asc(tempChatMessages.id))
          .limit(200);
        for (const message of messages)
          await enqueueTempChatMessageUploads(tx, message);
        if (messages.length) {
          await tx.delete(tempChatMessages).where(
            inArray(
              tempChatMessages.id,
              messages.map((m) => m.id),
            ),
          );
        }
        await tx
          .update(tempChatUploads)
          .set({ status: 'deleting' })
          .where(eq(tempChatUploads.chatId, id));
        const remaining = await tx
          .select({ id: tempChatMessages.id })
          .from(tempChatMessages)
          .where(eq(tempChatMessages.chatId, id))
          .limit(1);
        if (remaining.length) return 0;
        await tx
          .delete(tempChats)
          .where(and(eq(tempChats.id, id), lte(tempChats.expiresAt, cutoff)));
        return 1;
      });
    } catch {
      failed += 1;
    }
  }
  return { deleted, failed };
}

export async function cleanupTempChatUploads(cutoff: Date) {
  // Claim durably before network I/O. Retries remain deleting and cannot attach.
  const rows = await db.transaction(async (tx) => {
    const selected = await tx
      .select()
      .from(tempChatUploads)
      .where(
        and(
          inArray(tempChatUploads.status, ['pending', 'deleting']),
          lte(tempChatUploads.cleanupAfter, cutoff),
        ),
      )
      .orderBy(asc(tempChatUploads.cleanupAfter), asc(tempChatUploads.id))
      .limit(100)
      .for('update', { skipLocked: true });
    if (selected.length) {
      await tx
        .update(tempChatUploads)
        .set({
          status: 'deleting',
          cleanupAfter: new Date(cutoff.getTime() + 60 * 60 * 1_000),
        })
        .where(
          inArray(
            tempChatUploads.id,
            selected.map((row) => row.id),
          ),
        );
    }
    return selected;
  });
  let deleted = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      // Legacy messages may share an object; never delete a surviving reference.
      const references = await db
        .select({ id: tempChatMessages.id })
        .from(tempChatMessages)
        .where(
          sql`${tempChatMessages.attachments} @> ${JSON.stringify([{ provider: row.provider, path: row.path }])}::jsonb`,
        )
        .limit(1);
      if (references.length) continue;
      if (row.provider === 'r2') {
        const result = await deleteR2Objects([row.path]);
        if (result.failed || result.deleted !== 1)
          throw new Error('Storage deletion failed.');
      } else {
        // Auto upload signatures can be used on any resource endpoint. Do not
        // combine these calls: the shared helper deduplicates by public id.
        for (const resourceType of TEMP_CHAT_RESOURCE_TYPES) {
          const result = await deleteCloudinaryPublicIds([
            { publicId: row.path, resourceType },
          ]);
          if (result.failed || !result.completedPublicIds.includes(row.path)) {
            throw new Error('Storage deletion failed.');
          }
        }
      }
      await db
        .delete(tempChatUploads)
        .where(
          and(
            eq(tempChatUploads.id, row.id),
            eq(tempChatUploads.status, 'deleting'),
          ),
        );
      deleted += 1;
    } catch {
      failed += 1;
    }
  }
  return { selected: rows.length, deleted, failed };
}

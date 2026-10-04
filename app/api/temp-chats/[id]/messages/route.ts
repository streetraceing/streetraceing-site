import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { tempChatMessages } from '@/db/schema';
import {
  noStoreJson,
  readJsonObjectBody,
  requireDatabase,
} from '@/lib/api-response';
import { createR2PresignedGetUrl, getR2Config } from '@/lib/r2';
import {
  getActiveTempChatByCode,
  getTempChatBearerToken,
  verifyTempChatMemberToken,
  TEMP_CHAT_CODE_PATTERN,
  TEMP_CHAT_MAX_ATTACHMENTS,
  TEMP_CHAT_MAX_MESSAGE_LENGTH,
  TEMP_CHAT_MESSAGE_WINDOW,
  parseTempChatAttachmentRequest,
  type TempChatMessageAttachment,
  type TempChatAttachmentRequest,
} from '@/lib/temp-chat';
import {
  consumeTempChatUploads,
  InvalidTempChatUpload,
  lockActiveTempChat,
  verifyTempChatAttachments,
} from '@/lib/temp-chat-uploads';
import { getRequestLocale, translations } from '@/utils/i18n';
import { getCloudinarySquareImageUrl } from '@/utils/media';
import { checkDurableRateLimit, getClientAddress } from '@/utils/rate-limit';

export const runtime = 'nodejs';
const MAX_POST_BODY_BYTES = 256 * 1_024;
const READ_IP_RATE_LIMIT = 120;
const READ_IP_WINDOW_MS = 60 * 1_000;
const POST_IP_RATE_LIMIT = 60;
const POST_IP_WINDOW_MS = 10 * 60 * 1_000;
type RouteContext = { params: Promise<{ id: string }> };

function buildAttachmentViews(attachments: TempChatMessageAttachment[]) {
  const r2Configured = Boolean(getR2Config());
  return attachments.map((attachment) => {
    const isImage =
      attachment.resourceType === 'image' ||
      attachment.type.startsWith('image/');
    let url: string | undefined;
    let previewUrl: string | undefined;
    if (attachment.provider === 'cloudinary' && attachment.url) {
      url = attachment.url;
      previewUrl = isImage ? getCloudinarySquareImageUrl(url, 320) : undefined;
    } else if (attachment.provider === 'r2' && r2Configured) {
      url = createR2PresignedGetUrl(attachment.path, 30 * 60);
      previewUrl = isImage ? url : undefined;
    }
    return {
      provider: attachment.provider,
      path: attachment.path,
      url,
      previewUrl,
      downloadUrl: url,
      name: attachment.name,
      size: attachment.size,
      type: attachment.type,
      isImage,
    };
  });
}

function messageView(row: typeof tempChatMessages.$inferSelect) {
  return {
    id: row.id,
    memberId: row.memberId,
    authorName: row.authorName,
    content: row.content ?? undefined,
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt?.toISOString(),
    attachments: buildAttachmentViews(row.attachments),
  };
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const strings = translations[getRequestLocale(request)].tempChat;
  if (!TEMP_CHAT_CODE_PATTERN.test(id)) {
    return noStoreJson({ error: strings.roomNotFound }, { status: 404 });
  }
  const ipRateLimit = await checkDurableRateLimit({
    key: `temp-chat:read:${getClientAddress(request)}`,
    limit: READ_IP_RATE_LIMIT,
    windowMs: READ_IP_WINDOW_MS,
  });
  if (!ipRateLimit.allowed)
    return noStoreJson({ error: strings.loadFailed }, { status: 429 });
  const guard = requireDatabase(strings.loadFailed);
  if (guard) return guard;
  const chat = await getActiveTempChatByCode(id);
  if (!chat) return noStoreJson({ error: strings.expired }, { status: 404 });
  const member = verifyTempChatMemberToken(
    getTempChatBearerToken(request),
    chat.id,
  );
  if (!member)
    return noStoreJson({ error: strings.sessionExpired }, { status: 401 });
  const rateLimit = await checkDurableRateLimit({
    key: `temp-chat:read:${chat.id}:${member.memberId}`,
    limit: 60,
    windowMs: 60 * 1_000,
  });
  if (!rateLimit.allowed)
    return noStoreJson({ error: strings.loadFailed }, { status: 429 });

  // Fetch newest first, including one sentinel, then display chronologically.
  const rows = await db
    .select()
    .from(tempChatMessages)
    .where(eq(tempChatMessages.chatId, chat.id))
    .orderBy(desc(tempChatMessages.createdAt), desc(tempChatMessages.id))
    .limit(TEMP_CHAT_MESSAGE_WINDOW + 1);
  return noStoreJson({
    messages: rows
      .slice(0, TEMP_CHAT_MESSAGE_WINDOW)
      .reverse()
      .map(messageView),
    hasOlderMessages: rows.length > TEMP_CHAT_MESSAGE_WINDOW,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const strings = translations[getRequestLocale(request)].tempChat;
  if (!TEMP_CHAT_CODE_PATTERN.test(id)) {
    return noStoreJson({ error: strings.roomNotFound }, { status: 404 });
  }
  const ipRateLimit = await checkDurableRateLimit({
    key: `temp-chat:post:${getClientAddress(request)}`,
    limit: POST_IP_RATE_LIMIT,
    windowMs: POST_IP_WINDOW_MS,
  });
  if (!ipRateLimit.allowed)
    return noStoreJson({ error: strings.sendFailed }, { status: 429 });
  const guard = requireDatabase(strings.sendFailed);
  if (guard) return guard;
  const chat = await getActiveTempChatByCode(id);
  if (!chat) return noStoreJson({ error: strings.expired }, { status: 404 });
  const member = verifyTempChatMemberToken(
    getTempChatBearerToken(request),
    chat.id,
  );
  if (!member)
    return noStoreJson({ error: strings.sessionExpired }, { status: 401 });
  const rateLimit = await checkDurableRateLimit({
    key: `temp-chat:post:${chat.id}:${member.memberId}`,
    limit: 20,
    windowMs: 10 * 60 * 1_000,
  });
  if (!rateLimit.allowed)
    return noStoreJson({ error: strings.sendFailed }, { status: 429 });
  const result = await readJsonObjectBody(request, MAX_POST_BODY_BYTES, {
    invalidError: strings.invalidRequest,
  });
  if (!result.ok) return result.response;
  const body = result.value;
  if (
    (body.content !== undefined && typeof body.content !== 'string') ||
    (body.attachments !== undefined && !Array.isArray(body.attachments))
  ) {
    return noStoreJson({ error: strings.invalidRequest }, { status: 400 });
  }
  const content = typeof body.content === 'string' ? body.content : '';
  if (content.length > TEMP_CHAT_MAX_MESSAGE_LENGTH) {
    return noStoreJson({ error: strings.messageTooLong }, { status: 400 });
  }
  const rawAttachments = Array.isArray(body.attachments)
    ? body.attachments
    : [];
  if (rawAttachments.length > TEMP_CHAT_MAX_ATTACHMENTS) {
    return noStoreJson({ error: strings.attachmentsLimit }, { status: 400 });
  }
  const requested: TempChatAttachmentRequest[] = [];
  for (const value of rawAttachments) {
    const attachment = parseTempChatAttachmentRequest(value);
    if (!attachment)
      return noStoreJson({ error: strings.uploadFailed }, { status: 400 });
    requested.push(attachment);
  }
  if (!content.trim() && !requested.length) {
    return noStoreJson({ error: strings.invalidMessage }, { status: 400 });
  }
  try {
    const attachments = await verifyTempChatAttachments(
      chat.id,
      member.memberId,
      requested,
    );
    const row = await db.transaction(async (tx) => {
      await lockActiveTempChat(tx, chat.id);
      const [saved] = await tx
        .insert(tempChatMessages)
        .values({
          chatId: chat.id,
          memberId: member.memberId,
          authorName: member.name,
          content: content.trim() ? content : null,
          attachments,
        })
        .returning();
      if (!saved) throw new Error('Message insertion failed.');
      await consumeTempChatUploads(
        tx,
        chat.id,
        member.memberId,
        saved.id,
        attachments,
      );
      return saved;
    });
    return noStoreJson({ message: messageView(row) }, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidTempChatUpload) {
      return noStoreJson({ error: strings.uploadFailed }, { status: 400 });
    }
    // Do not log provider credentials or message data from nested errors.
    console.error('Could not save a temp chat message.');
    return noStoreJson({ error: strings.sendFailed }, { status: 500 });
  }
}

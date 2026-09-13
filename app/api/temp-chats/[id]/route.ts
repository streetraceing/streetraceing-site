import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { tempChatMessages, tempChats } from '@/db/schema';
import { deleteR2Objects } from '@/lib/r2';
import { noStoreJson, requireDatabase } from '@/lib/api-response';
import {
  getActiveTempChatByCode,
  getTempChatOwnerToken,
  isTempChatOwnerTokenEqual,
  TEMP_CHAT_CODE_PATTERN,
} from '@/lib/temp-chat';
import { getRequestLocale, translations } from '@/utils/i18n';
import { checkDurableRateLimit, getClientAddress } from '@/utils/rate-limit';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const DELETE_RATE_LIMIT = 10;
const DELETE_RATE_WINDOW_MS = 10 * 60 * 1_000;

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!TEMP_CHAT_CODE_PATTERN.test(id)) {
    return noStoreJson({ error: 'Not found.' }, { status: 404 });
  }

  const strings = translations[getRequestLocale(request)].tempChat;
  const databaseGuard = requireDatabase(strings.roomNotFound);
  if (databaseGuard) {
    return databaseGuard;
  }

  const chat = await getActiveTempChatByCode(id);

  if (!chat) {
    return noStoreJson({ error: strings.roomNotFound }, { status: 404 });
  }

  return noStoreJson({
    title: chat.title,
    expiresAt: chat.expiresAt.toISOString(),
    requiresPassword: Boolean(chat.passwordHash),
    isOwner: isTempChatOwnerTokenEqual(
      getTempChatOwnerToken(request),
      chat.ownerToken,
    ),
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!TEMP_CHAT_CODE_PATTERN.test(id)) {
    return noStoreJson({ error: 'Not found.' }, { status: 404 });
  }

  const strings = translations[getRequestLocale(request)].tempChat;
  const rateLimit = await checkDurableRateLimit({
    key: `temp-chat:delete:${getClientAddress(request)}`,
    limit: DELETE_RATE_LIMIT,
    windowMs: DELETE_RATE_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    return noStoreJson({ error: strings.joinRateLimited }, { status: 429 });
  }

  const databaseGuard = requireDatabase(strings.deleteFailed);
  if (databaseGuard) {
    return databaseGuard;
  }

  const ownerToken = getTempChatOwnerToken(request);
  const chat = await getActiveTempChatByCode(id);

  if (!chat || !isTempChatOwnerTokenEqual(ownerToken, chat.ownerToken)) {
    return noStoreJson({ error: strings.roomNotFound }, { status: 404 });
  }

  const attachments = await db
    .select({ fileKey: tempChatMessages.fileKey })
    .from(tempChatMessages)
    .where(eq(tempChatMessages.chatId, chat.id));

  const deleteResult = await deleteR2Objects(
    attachments
      .map((attachment) => attachment.fileKey)
      .filter((fileKey): fileKey is string => Boolean(fileKey)),
  );

  if (deleteResult.failed > 0) {
    return noStoreJson({ error: strings.deleteFailed }, { status: 502 });
  }

  await db.delete(tempChats).where(eq(tempChats.id, chat.id));

  return noStoreJson({ deleted: true });
}

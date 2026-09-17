import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { tempChats } from '@/db/schema';
import { noStoreJson, requireDatabase } from '@/lib/api-response';
import { lockActiveTempChat } from '@/lib/temp-chat-uploads';
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

  // Revoke access immediately, preserving legacy messages until the bounded
  // cron drain has copied every attachment into durable cleanup inventory.
  try {
    await db.transaction(async (tx) => {
      await lockActiveTempChat(tx, chat.id);
      await tx
        .update(tempChats)
        .set({ expiresAt: new Date() })
        .where(eq(tempChats.id, chat.id));
    });
  } catch {
    return noStoreJson({ error: strings.deleteFailed }, { status: 500 });
  }

  return noStoreJson({ deleted: true });
}

import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { tempChatMessages } from '@/db/schema';
import {
  noStoreJson,
  readJsonObjectBody,
  requireDatabase,
} from '@/lib/api-response';
import {
  enqueueTempChatMessageUploads,
  lockActiveTempChat,
} from '@/lib/temp-chat-uploads';
import {
  getActiveTempChatByCode,
  getTempChatBearerToken,
  verifyTempChatMemberToken,
  TEMP_CHAT_CODE_PATTERN,
  TEMP_CHAT_MAX_MESSAGE_LENGTH,
} from '@/lib/temp-chat';
import { getRequestLocale, translations } from '@/utils/i18n';
import { checkDurableRateLimit, getClientAddress } from '@/utils/rate-limit';

export const runtime = 'nodejs';

const MESSAGE_MUTATION_RATE_LIMIT = 30;
const MESSAGE_MUTATION_RATE_WINDOW_MS = 10 * 60 * 1_000;
const MAX_EDIT_BODY_BYTES = 96 * 1_024;
const MESSAGE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: Promise<{ id: string; messageId: string }>;
};

async function loadOwnMessage(
  request: Request,
  code: string,
  messageId: string,
  strings: { expired: string; roomNotFound: string },
) {
  if (
    !TEMP_CHAT_CODE_PATTERN.test(code) ||
    !MESSAGE_ID_PATTERN.test(messageId)
  ) {
    return {
      error: noStoreJson({ error: strings.roomNotFound }, { status: 404 }),
    };
  }

  const chat = await getActiveTempChatByCode(code);

  if (!chat) {
    return { error: noStoreJson({ error: strings.expired }, { status: 404 }) };
  }

  const member = verifyTempChatMemberToken(
    getTempChatBearerToken(request),
    chat.id,
  );

  if (!member) {
    return {
      error: noStoreJson({ error: strings.expired }, { status: 401 }),
    };
  }

  const [message] = await db
    .select()
    .from(tempChatMessages)
    .where(
      and(
        eq(tempChatMessages.id, messageId),
        eq(tempChatMessages.chatId, chat.id),
      ),
    )
    .limit(1);

  if (!message) {
    return {
      error: noStoreJson({ error: strings.roomNotFound }, { status: 404 }),
    };
  }

  if (message.memberId !== member.memberId) {
    return {
      error: noStoreJson({ error: strings.roomNotFound }, { status: 403 }),
    };
  }

  return { chat, member, message };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id, messageId } = await context.params;
  const strings = translations[getRequestLocale(request)].tempChat;

  const databaseGuard = requireDatabase(strings.sendFailed);
  if (databaseGuard) {
    return databaseGuard;
  }

  const rateLimit = await checkDurableRateLimit({
    key: `temp-chat:message-mutate:${getClientAddress(request)}`,
    limit: MESSAGE_MUTATION_RATE_LIMIT,
    windowMs: MESSAGE_MUTATION_RATE_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    return noStoreJson({ error: strings.sendFailed }, { status: 429 });
  }

  const loaded = await loadOwnMessage(request, id, messageId, strings);

  if ('error' in loaded) {
    return loaded.error;
  }

  const bodyResult = await readJsonObjectBody(request, MAX_EDIT_BODY_BYTES, {
    invalidError: strings.sendFailed,
  });

  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  const content =
    typeof bodyResult.value.content === 'string'
      ? bodyResult.value.content
      : '';

  if (!content.trim() || content.length > TEMP_CHAT_MAX_MESSAGE_LENGTH) {
    return noStoreJson({ error: strings.invalidMessage }, { status: 400 });
  }

  const { message } = loaded;

  if (message.attachments.length > 0) {
    return noStoreJson({ error: strings.invalidMessage }, { status: 400 });
  }

  const editedAt = new Date();

  await db
    .update(tempChatMessages)
    .set({ content, editedAt })
    .where(eq(tempChatMessages.id, message.id));

  return noStoreJson({
    message: {
      id: message.id,
      memberId: message.memberId,
      authorName: message.authorName,
      content,
      createdAt: message.createdAt.toISOString(),
      editedAt: editedAt.toISOString(),
      attachments: [],
    },
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id, messageId } = await context.params;
  const strings = translations[getRequestLocale(request)].tempChat;

  const databaseGuard = requireDatabase(strings.deleteFailed);
  if (databaseGuard) {
    return databaseGuard;
  }

  const rateLimit = await checkDurableRateLimit({
    key: `temp-chat:message-mutate:${getClientAddress(request)}`,
    limit: MESSAGE_MUTATION_RATE_LIMIT,
    windowMs: MESSAGE_MUTATION_RATE_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    return noStoreJson({ error: strings.deleteFailed }, { status: 429 });
  }

  const loaded = await loadOwnMessage(request, id, messageId, strings);

  if ('error' in loaded) {
    return loaded.error;
  }

  const { message, chat } = loaded;
  try {
    await db.transaction(async (tx) => {
      await lockActiveTempChat(tx, chat.id);
      const [current] = await tx
        .select()
        .from(tempChatMessages)
        .where(eq(tempChatMessages.id, message.id))
        .for('update');
      if (!current) return;
      await enqueueTempChatMessageUploads(tx, current);
      await tx
        .delete(tempChatMessages)
        .where(eq(tempChatMessages.id, current.id));
    });
  } catch {
    return noStoreJson({ error: strings.deleteFailed }, { status: 500 });
  }

  return noStoreJson({ deleted: true });
}

import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { tempChatMessages } from '@/db/schema';
import {
  noStoreJson,
  readJsonObjectBody,
  requireDatabase,
} from '@/lib/api-response';
import { deleteCloudinaryPublicIds } from '@/lib/cloudinary-media';
import { deleteR2Objects } from '@/lib/r2';
import {
  getActiveTempChatByCode,
  getTempChatBearerToken,
  isTempChatResourceType,
  verifyTempChatMemberToken,
  TEMP_CHAT_CODE_PATTERN,
  TEMP_CHAT_MAX_MESSAGE_LENGTH,
} from '@/lib/temp-chat';
import { getRequestLocale, translations } from '@/utils/i18n';
import { checkDurableRateLimit, getClientAddress } from '@/utils/rate-limit';

export const runtime = 'nodejs';

const EDIT_RATE_LIMIT = 30;
const EDIT_RATE_WINDOW_MS = 10 * 60 * 1_000;
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
    key: `temp-chat:edit:${getClientAddress(request)}`,
    limit: EDIT_RATE_LIMIT,
    windowMs: EDIT_RATE_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    return noStoreJson({ error: strings.sendFailed }, { status: 429 });
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

  const loaded = await loadOwnMessage(request, id, messageId, strings);

  if ('error' in loaded) {
    return loaded.error;
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

  const loaded = await loadOwnMessage(request, id, messageId, strings);

  if ('error' in loaded) {
    return loaded.error;
  }

  const { message } = loaded;
  const cloudinaryEntries = message.attachments.flatMap((attachment) => {
    if (
      attachment.provider !== 'cloudinary' ||
      !isTempChatResourceType(attachment.resourceType)
    ) {
      return [];
    }

    return [
      { publicId: attachment.path, resourceType: attachment.resourceType },
    ];
  });
  const r2Keys = message.attachments
    .filter(
      (attachment) => attachment.provider === 'r2' && Boolean(attachment.path),
    )
    .map((attachment) => attachment.path);

  const [cloudinaryResult, r2Result] = await Promise.all([
    cloudinaryEntries.length > 0
      ? deleteCloudinaryPublicIds(cloudinaryEntries)
      : Promise.resolve({ failed: 0 }),
    r2Keys.length > 0
      ? deleteR2Objects(r2Keys)
      : Promise.resolve({ failed: 0 }),
  ]);

  if (cloudinaryResult.failed + r2Result.failed > 0) {
    return noStoreJson({ error: strings.deleteFailed }, { status: 502 });
  }

  await db.delete(tempChatMessages).where(eq(tempChatMessages.id, message.id));

  return noStoreJson({ deleted: true });
}

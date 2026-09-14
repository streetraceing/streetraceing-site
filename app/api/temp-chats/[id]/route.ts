import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { tempChatMessages, tempChats } from '@/db/schema';
import { deleteCloudinaryPublicIds } from '@/lib/cloudinary-media';
import { noStoreJson, requireDatabase } from '@/lib/api-response';
import { deleteR2Objects } from '@/lib/r2';
import {
  getActiveTempChatByCode,
  getTempChatOwnerToken,
  isTempChatOwnerTokenEqual,
  isTempChatResourceType,
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
    .select({ attachments: tempChatMessages.attachments })
    .from(tempChatMessages)
    .where(eq(tempChatMessages.chatId, chat.id));

  const cloudinaryEntries = attachments.flatMap(
    ({ attachments: messageAttachments }) =>
      messageAttachments.flatMap((attachment) => {
        if (
          attachment.provider !== 'cloudinary' ||
          !isTempChatResourceType(attachment.resourceType)
        ) {
          return [];
        }

        return [
          {
            publicId: attachment.path,
            resourceType: attachment.resourceType,
          },
        ];
      }),
  );
  const r2Keys = attachments.flatMap(({ attachments: messageAttachments }) =>
    messageAttachments
      .filter(
        (attachment) =>
          attachment.provider === 'r2' && Boolean(attachment.path),
      )
      .map((attachment) => attachment.path),
  );

  const emptyCloudinaryResult = {
    requested: 0,
    deleted: 0,
    notFound: 0,
    failed: 0,
    completedPublicIds: [] as string[],
  };
  const emptyR2Result = { requested: 0, deleted: 0, failed: 0 };

  const [cloudinaryResult, r2Result] = await Promise.all([
    cloudinaryEntries.length > 0
      ? deleteCloudinaryPublicIds(cloudinaryEntries)
      : Promise.resolve(emptyCloudinaryResult),
    r2Keys.length > 0
      ? deleteR2Objects(r2Keys)
      : Promise.resolve(emptyR2Result),
  ]);

  if (cloudinaryResult.failed + r2Result.failed > 0) {
    return noStoreJson({ error: strings.deleteFailed }, { status: 502 });
  }

  await db.delete(tempChats).where(eq(tempChats.id, chat.id));

  return noStoreJson({ deleted: true });
}

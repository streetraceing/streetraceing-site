import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { tempChatMessages } from '@/db/schema';
import {
  noStoreJson,
  readJsonObjectBody,
  requireDatabase,
} from '@/lib/api-response';
import { getCloudinaryConfig } from '@/lib/cloudinary-media';
import { createR2PresignedGetUrl, getR2Config } from '@/lib/r2';
import {
  buildTempChatDeliveryUrl,
  getActiveTempChatByCode,
  getTempChatBearerToken,
  getTempChatStorageDriver,
  verifyTempChatMemberToken,
  TEMP_CHAT_CODE_PATTERN,
} from '@/lib/temp-chat';
import { getRequestLocale, translations } from '@/utils/i18n';
import { checkDurableRateLimit } from '@/utils/rate-limit';

export const runtime = 'nodejs';

const LINK_RATE_LIMIT = 30;
const LINK_RATE_WINDOW_MS = 10 * 60 * 1_000;
const DOWNLOAD_URL_EXPIRES_IN = 15 * 60;
const MAX_LINK_BODY_BYTES = 1 * 1_024;
const MESSAGE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!TEMP_CHAT_CODE_PATTERN.test(id)) {
    return noStoreJson({ error: 'Not found.' }, { status: 404 });
  }

  const strings = translations[getRequestLocale(request)].tempChat;
  const databaseGuard = requireDatabase(strings.linkFailed);
  if (databaseGuard) {
    return databaseGuard;
  }

  const chat = await getActiveTempChatByCode(id);

  if (!chat) {
    return noStoreJson({ error: strings.expired }, { status: 404 });
  }

  const member = verifyTempChatMemberToken(
    getTempChatBearerToken(request),
    chat.id,
  );

  if (!member) {
    return noStoreJson({ error: strings.sessionExpired }, { status: 401 });
  }

  const rateLimit = await checkDurableRateLimit({
    key: `temp-chat:file:${chat.id}:${member.memberId}`,
    limit: LINK_RATE_LIMIT,
    windowMs: LINK_RATE_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    return noStoreJson({ error: strings.linkFailed }, { status: 429 });
  }

  const bodyResult = await readJsonObjectBody(request, MAX_LINK_BODY_BYTES, {
    invalidError: strings.linkFailed,
  });

  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  const messageId =
    typeof bodyResult.value.messageId === 'string' &&
    MESSAGE_ID_PATTERN.test(bodyResult.value.messageId)
      ? bodyResult.value.messageId
      : undefined;

  if (!messageId) {
    return noStoreJson({ error: strings.linkFailed }, { status: 400 });
  }

  const [message] = await db
    .select({
      fileProvider: tempChatMessages.fileProvider,
      filePath: tempChatMessages.filePath,
      fileUrl: tempChatMessages.fileUrl,
      fileName: tempChatMessages.fileName,
    })
    .from(tempChatMessages)
    .where(
      and(
        eq(tempChatMessages.id, messageId),
        eq(tempChatMessages.chatId, chat.id),
      ),
    )
    .limit(1);

  if (!message?.filePath) {
    return noStoreJson({ error: strings.linkFailed }, { status: 404 });
  }

  const driver = message.fileProvider ?? getTempChatStorageDriver();
  const fileName = message.fileName ?? 'file';

  try {
    if (driver === 'r2') {
      const storageConfig = getR2Config();

      if (!storageConfig) {
        return noStoreJson(
          { error: strings.storageUnavailable },
          { status: 503 },
        );
      }

      return noStoreJson({
        url: createR2PresignedGetUrl(message.filePath, DOWNLOAD_URL_EXPIRES_IN),
        expiresIn: DOWNLOAD_URL_EXPIRES_IN,
        fileName,
      });
    }

    const storageConfig = getCloudinaryConfig();

    if (!storageConfig || !message.fileUrl) {
      return noStoreJson({ error: strings.linkFailed }, { status: 404 });
    }

    return noStoreJson({
      url: buildTempChatDeliveryUrl(message.fileUrl, fileName),
      fileName,
    });
  } catch (error) {
    console.error('Could not sign a temp chat file link.', error);
    return noStoreJson({ error: strings.linkFailed }, { status: 500 });
  }
}

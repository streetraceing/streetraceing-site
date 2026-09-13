import { and, asc, eq, gt } from 'drizzle-orm';

import { db } from '@/db';
import { tempChatMessages } from '@/db/schema';
import {
  noStoreJson,
  readJsonObjectBody,
  requireDatabase,
} from '@/lib/api-response';
import { getCloudinaryConfig } from '@/lib/cloudinary-media';
import {
  buildTempChatDeliveryUrl,
  getActiveTempChatByCode,
  getTempChatBearerToken,
  isTempChatFilePublicId,
  isTempChatResourceType,
  sanitizeTempChatFileName,
  verifyTempChatMemberToken,
  TEMP_CHAT_CODE_PATTERN,
  TEMP_CHAT_MAX_FILE_BYTES,
  TEMP_CHAT_MAX_MESSAGE_LENGTH,
} from '@/lib/temp-chat';
import { getRequestLocale, translations } from '@/utils/i18n';
import { getCloudinaryPublicIdFromUrl } from '@/utils/media';
import { checkDurableRateLimit } from '@/utils/rate-limit';

export const runtime = 'nodejs';

const READ_RATE_LIMIT = 60;
const READ_RATE_WINDOW_MS = 60 * 1_000;
const POST_RATE_LIMIT = 20;
const POST_RATE_WINDOW_MS = 10 * 60 * 1_000;
const MAX_POST_BODY_BYTES = 96 * 1_024;

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isMessageFileValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!TEMP_CHAT_CODE_PATTERN.test(id)) {
    return noStoreJson({ error: 'Not found.' }, { status: 404 });
  }

  const strings = translations[getRequestLocale(request)].tempChat;
  const databaseGuard = requireDatabase(strings.loadFailed);
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
    key: `temp-chat:read:${chat.id}:${member.memberId}`,
    limit: READ_RATE_LIMIT,
    windowMs: READ_RATE_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    return noStoreJson({ error: strings.loadFailed }, { status: 429 });
  }

  const afterRaw = new URL(request.url).searchParams.get('after');
  let afterDate: Date | undefined;

  if (afterRaw) {
    const parsed = new Date(afterRaw);

    if (Number.isNaN(parsed.getTime())) {
      return noStoreJson({ error: strings.invalidRequest }, { status: 400 });
    }

    afterDate = parsed;
  }

  const rows = await db
    .select()
    .from(tempChatMessages)
    .where(
      afterDate
        ? and(
            eq(tempChatMessages.chatId, chat.id),
            gt(tempChatMessages.createdAt, afterDate),
          )
        : eq(tempChatMessages.chatId, chat.id),
    )
    .orderBy(asc(tempChatMessages.createdAt))
    .limit(200);

  return noStoreJson({
    messages: rows.map((row) => ({
      id: row.id,
      memberId: row.memberId,
      authorName: row.authorName,
      content: row.content ?? undefined,
      createdAt: row.createdAt.toISOString(),
      file: row.fileUrl
        ? {
            url: buildTempChatDeliveryUrl(row.fileUrl, row.fileName ?? 'file'),
            name: row.fileName ?? 'file',
            size: row.fileSize ?? 0,
            type: row.fileType ?? undefined,
          }
        : undefined,
    })),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!TEMP_CHAT_CODE_PATTERN.test(id)) {
    return noStoreJson({ error: 'Not found.' }, { status: 404 });
  }

  const strings = translations[getRequestLocale(request)].tempChat;
  const databaseGuard = requireDatabase(strings.sendFailed);
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
    key: `temp-chat:post:${chat.id}:${member.memberId}`,
    limit: POST_RATE_LIMIT,
    windowMs: POST_RATE_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    return noStoreJson({ error: strings.sendFailed }, { status: 429 });
  }

  const bodyResult = await readJsonObjectBody(request, MAX_POST_BODY_BYTES, {
    invalidError: strings.sendFailed,
  });

  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  const content =
    typeof bodyResult.value.content === 'string'
      ? bodyResult.value.content
      : undefined;
  const hasContent = Boolean(content && content.trim().length > 0);
  const file = isMessageFileValue(bodyResult.value.file)
    ? bodyResult.value.file
    : undefined;

  if (hasContent === Boolean(file)) {
    return noStoreJson({ error: strings.invalidMessage }, { status: 400 });
  }

  if (content && content.length > TEMP_CHAT_MAX_MESSAGE_LENGTH) {
    return noStoreJson({ error: strings.messageTooLong }, { status: 400 });
  }

  let fileValues:
    | {
        fileUrl: string;
        filePublicId: string;
        fileResourceType: string;
        fileName: string;
        fileType: string;
        fileSize: number;
      }
    | undefined;

  if (file) {
    const storageConfig = getCloudinaryConfig();
    const fileUrl =
      typeof file.url === 'string' &&
      file.url.startsWith('https://res.cloudinary.com/')
        ? file.url
        : undefined;
    const filePublicId =
      typeof file.publicId === 'string' ? file.publicId : undefined;
    const fileResourceType = isTempChatResourceType(file.resourceType)
      ? file.resourceType
      : undefined;

    if (
      !storageConfig ||
      !fileUrl ||
      !filePublicId ||
      !fileResourceType ||
      !isTempChatFilePublicId(chat.id, filePublicId) ||
      !fileUrl.startsWith(
        `https://res.cloudinary.com/${storageConfig.cloudName}/${fileResourceType}/upload/`,
      ) ||
      getCloudinaryPublicIdFromUrl(fileUrl, storageConfig.cloudName) !==
        filePublicId
    ) {
      return noStoreJson({ error: strings.uploadFailed }, { status: 400 });
    }

    const rawSize = file.size;
    const fileSize =
      typeof rawSize === 'number' && Number.isSafeInteger(rawSize)
        ? rawSize
        : -1;

    if (fileSize < 1 || fileSize > TEMP_CHAT_MAX_FILE_BYTES) {
      return noStoreJson({ error: strings.fileTooLarge }, { status: 400 });
    }

    const fileType =
      typeof file.type === 'string' && file.type.length <= 128
        ? file.type
        : 'application/octet-stream';

    fileValues = {
      fileUrl,
      filePublicId,
      fileResourceType,
      fileName: sanitizeTempChatFileName(
        typeof file.name === 'string' ? file.name : '',
      ),
      fileType,
      fileSize,
    };
  }

  try {
    const [row] = await db
      .insert(tempChatMessages)
      .values({
        chatId: chat.id,
        memberId: member.memberId,
        authorName: member.name,
        content: hasContent ? content : null,
        fileUrl: fileValues?.fileUrl ?? null,
        filePublicId: fileValues?.filePublicId ?? null,
        fileResourceType: fileValues?.fileResourceType ?? null,
        fileName: fileValues?.fileName ?? null,
        fileType: fileValues?.fileType ?? null,
        fileSize: fileValues?.fileSize ?? null,
      })
      .returning();

    if (!row) {
      return noStoreJson({ error: strings.sendFailed }, { status: 500 });
    }

    return noStoreJson(
      {
        message: {
          id: row.id,
          memberId: row.memberId,
          authorName: row.authorName,
          content: row.content ?? undefined,
          createdAt: row.createdAt.toISOString(),
          file: row.fileUrl
            ? {
                url: buildTempChatDeliveryUrl(
                  row.fileUrl,
                  row.fileName ?? 'file',
                ),
                name: row.fileName ?? 'file',
                size: row.fileSize ?? 0,
                type: row.fileType ?? undefined,
              }
            : undefined,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Could not save a temp chat message.', error);
    return noStoreJson({ error: strings.sendFailed }, { status: 500 });
  }
}

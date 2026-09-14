import { and, asc, eq, gt } from 'drizzle-orm';

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
  getActiveTempChatByCode,
  getTempChatBearerToken,
  getTempChatPublicIdFromUrl,
  getTempChatStorageDriver,
  getTempChatUrlResourceType,
  isTempChatFilePublicId,
  sanitizeTempChatFileName,
  verifyTempChatMemberToken,
  TEMP_CHAT_CODE_PATTERN,
  TEMP_CHAT_MAX_ATTACHMENTS,
  TEMP_CHAT_MAX_FILE_BYTES,
  TEMP_CHAT_MAX_MESSAGE_LENGTH,
  type TempChatMessageAttachment,
} from '@/lib/temp-chat';
import { getRequestLocale, translations } from '@/utils/i18n';
import { getCloudinarySquareImageUrl } from '@/utils/media';
import { checkDurableRateLimit } from '@/utils/rate-limit';

export const runtime = 'nodejs';

const READ_RATE_LIMIT = 60;
const READ_RATE_WINDOW_MS = 60 * 1_000;
const POST_RATE_LIMIT = 20;
const POST_RATE_WINDOW_MS = 10 * 60 * 1_000;
const MAX_POST_BODY_BYTES = 256 * 1_024;

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isMessageFileValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Validates one client-supplied attachment and builds the stored record.
 * Returns an error string on failure. */
function parseAttachment(
  value: unknown,
  chatId: string,
  cloudName: string,
  storageDriver: string,
): { attachment: TempChatMessageAttachment } | { error: string } {
  if (!isMessageFileValue(value)) {
    return { error: 'invalid' };
  }

  const rawSize = value.size;
  const size =
    typeof rawSize === 'number' && Number.isSafeInteger(rawSize) ? rawSize : -1;

  if (size < 1 || size > TEMP_CHAT_MAX_FILE_BYTES) {
    return { error: 'size' };
  }

  const name = sanitizeTempChatFileName(
    typeof value.name === 'string' ? value.name : '',
  );
  const type =
    typeof value.type === 'string' && value.type.length <= 128
      ? value.type
      : 'application/octet-stream';
  const provider = value.provider;
  const clientPath =
    typeof value.publicId === 'string'
      ? value.publicId
      : typeof value.key === 'string'
        ? value.key
        : undefined;

  if (provider === 'cloudinary') {
    const fileUrl =
      typeof value.url === 'string' &&
      value.url.startsWith(`https://res.cloudinary.com/${cloudName}/`)
        ? value.url
        : undefined;
    const resourceType = fileUrl
      ? getTempChatUrlResourceType(fileUrl)
      : undefined;
    const derivedPublicId =
      fileUrl && resourceType
        ? getTempChatPublicIdFromUrl(fileUrl, cloudName, resourceType)
        : undefined;
    // Cloudinary appends the detected format (".jpg", ".png", …) to the
    // public id inside delivery URLs, so accept that exact suffix too.
    const publicIdMatches =
      Boolean(derivedPublicId) &&
      Boolean(clientPath) &&
      (derivedPublicId === clientPath ||
        Boolean(clientPath && derivedPublicId?.startsWith(`${clientPath}.`)));

    if (
      !fileUrl ||
      !clientPath ||
      !resourceType ||
      !isTempChatFilePublicId(chatId, clientPath) ||
      !publicIdMatches
    ) {
      return { error: 'upload' };
    }

    return {
      attachment: {
        provider: 'cloudinary',
        path: clientPath,
        url: fileUrl,
        resourceType,
        name,
        type,
        size,
      },
    };
  }

  if (provider === 'r2') {
    if (storageDriver !== 'r2' || !isTempChatFilePublicId(chatId, clientPath)) {
      return { error: 'upload' };
    }

    return {
      attachment: {
        provider: 'r2',
        path: clientPath,
        url: null,
        resourceType: null,
        name,
        type,
        size,
      },
    };
  }

  return { error: 'provider' };
}

function buildAttachmentViews(
  attachments: TempChatMessageAttachment[],
  cloudName: string,
  r2Configured: boolean,
) {
  const r2ExpiresIn = 30 * 60;

  return attachments.map((attachment) => {
    const isImage =
      attachment.resourceType === 'image' ||
      attachment.type.startsWith('image/');

    if (attachment.provider === 'cloudinary' && attachment.url) {
      return {
        provider: 'cloudinary' as const,
        path: attachment.path,
        url: attachment.url,
        previewUrl: isImage
          ? getCloudinarySquareImageUrl(attachment.url, 320)
          : undefined,
        downloadUrl: attachment.url,
        name: attachment.name,
        size: attachment.size,
        type: attachment.type,
        isImage,
      };
    }

    if (attachment.provider === 'r2' && r2Configured) {
      try {
        const url = createR2PresignedGetUrl(attachment.path, r2ExpiresIn);

        return {
          provider: 'r2' as const,
          path: attachment.path,
          url,
          previewUrl: isImage ? url : undefined,
          downloadUrl: url,
          name: attachment.name,
          size: attachment.size,
          type: attachment.type,
          isImage,
        };
      } catch {
        // Presigning can only fail when R2 is removed mid-flight; fall
        // through to the unconfigured view below.
      }
    }

    return {
      provider: attachment.provider,
      path: attachment.path,
      url: undefined,
      previewUrl: undefined,
      downloadUrl: undefined,
      name: attachment.name,
      size: attachment.size,
      type: attachment.type,
      isImage,
    };
  });
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

  const storageDriver = getTempChatStorageDriver();
  const r2Configured = storageDriver === 'r2' && Boolean(getR2Config());
  const cloudName = getCloudinaryConfig()?.cloudName ?? '';

  return noStoreJson({
    messages: rows.map((row) => ({
      id: row.id,
      memberId: row.memberId,
      authorName: row.authorName,
      content: row.content ?? undefined,
      createdAt: row.createdAt.toISOString(),
      editedAt: row.editedAt ? row.editedAt.toISOString() : undefined,
      attachments: buildAttachmentViews(
        row.attachments,
        cloudName,
        r2Configured,
      ),
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

  if (content && content.length > TEMP_CHAT_MAX_MESSAGE_LENGTH) {
    return noStoreJson({ error: strings.messageTooLong }, { status: 400 });
  }

  const storageDriver = getTempChatStorageDriver();
  const cloudName = getCloudinaryConfig()?.cloudName ?? '';
  const clientAttachments = Array.isArray(bodyResult.value.attachments)
    ? bodyResult.value.attachments
    : [];

  if (clientAttachments.length > TEMP_CHAT_MAX_ATTACHMENTS) {
    return noStoreJson({ error: strings.attachmentsLimit }, { status: 400 });
  }

  let attachments: TempChatMessageAttachment[] | undefined;

  if (clientAttachments.length > 0) {
    const parsed: TempChatMessageAttachment[] = [];

    for (const clientAttachment of clientAttachments) {
      const result = parseAttachment(
        clientAttachment,
        chat.id,
        cloudName,
        storageDriver,
      );

      if ('error' in result) {
        if (result.error === 'size') {
          return noStoreJson({ error: strings.fileTooLarge }, { status: 400 });
        }

        return noStoreJson({ error: strings.uploadFailed }, { status: 400 });
      }

      parsed.push(result.attachment);
    }

    attachments = parsed;
  }

  if (!hasContent && (!attachments || attachments.length === 0)) {
    return noStoreJson({ error: strings.invalidMessage }, { status: 400 });
  }

  try {
    const [row] = await db
      .insert(tempChatMessages)
      .values({
        chatId: chat.id,
        memberId: member.memberId,
        authorName: member.name,
        content: hasContent ? content : null,
        attachments: attachments ?? [],
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
          editedAt: row.editedAt ? row.editedAt.toISOString() : undefined,
          attachments: buildAttachmentViews(
            row.attachments,
            cloudName,
            storageDriver === 'r2' && Boolean(getR2Config()),
          ),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Could not save a temp chat message.', error);
    return noStoreJson({ error: strings.sendFailed }, { status: 500 });
  }
}

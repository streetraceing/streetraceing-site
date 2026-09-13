import {
  createCloudinarySignature,
  getCloudinaryConfig,
} from '@/lib/cloudinary-media';
import {
  noStoreJson,
  readJsonObjectBody,
  requireDatabase,
} from '@/lib/api-response';
import { createR2PresignedPutUrl, getR2Config } from '@/lib/r2';
import {
  buildTempChatContentDisposition,
  buildTempChatPublicId,
  createTempChatFileId,
  getActiveTempChatByCode,
  getTempChatBearerToken,
  getTempChatStorageDriver,
  sanitizeTempChatFileName,
  verifyTempChatMemberToken,
  TEMP_CHAT_CODE_PATTERN,
  TEMP_CHAT_MAX_FILE_BYTES,
  TEMP_CHAT_MAX_FILE_NAME_LENGTH,
} from '@/lib/temp-chat';
import { getRequestLocale, translations } from '@/utils/i18n';
import { checkDurableRateLimit } from '@/utils/rate-limit';

export const runtime = 'nodejs';

const UPLOAD_RATE_LIMIT = 10;
const UPLOAD_RATE_WINDOW_MS = 15 * 60 * 1_000;
const UPLOAD_URL_EXPIRES_IN = 5 * 60;
const MAX_AUTHORIZE_BODY_BYTES = 2 * 1_024;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!TEMP_CHAT_CODE_PATTERN.test(id)) {
    return noStoreJson({ error: 'Not found.' }, { status: 404 });
  }

  const strings = translations[getRequestLocale(request)].tempChat;
  const databaseGuard = requireDatabase(strings.uploadFailed);
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
    key: `temp-chat:upload:${chat.id}:${member.memberId}`,
    limit: UPLOAD_RATE_LIMIT,
    windowMs: UPLOAD_RATE_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    return noStoreJson({ error: strings.uploadFailed }, { status: 429 });
  }

  const bodyResult = await readJsonObjectBody(
    request,
    MAX_AUTHORIZE_BODY_BYTES,
    { invalidError: strings.uploadFailed },
  );

  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  const rawSize = bodyResult.value.size;
  const fileSize =
    typeof rawSize === 'number' && Number.isSafeInteger(rawSize) ? rawSize : -1;

  if (fileSize < 1 || fileSize > TEMP_CHAT_MAX_FILE_BYTES) {
    return noStoreJson({ error: strings.fileTooLarge }, { status: 400 });
  }

  const fileName = sanitizeTempChatFileName(
    typeof bodyResult.value.name === 'string' ? bodyResult.value.name : '',
  );

  if (fileName.length > TEMP_CHAT_MAX_FILE_NAME_LENGTH) {
    return noStoreJson({ error: strings.uploadFailed }, { status: 400 });
  }

  const fileType =
    typeof bodyResult.value.type === 'string' && bodyResult.value.type
      ? bodyResult.value.type.slice(0, 128)
      : 'application/octet-stream';
  const driver = getTempChatStorageDriver();
  const fileId = createTempChatFileId();
  const filePath = buildTempChatPublicId(chat.id, fileId);

  if (driver === 'r2') {
    const storageConfig = getR2Config();

    if (!storageConfig) {
      return noStoreJson(
        { error: strings.storageUnavailable },
        { status: 503 },
      );
    }

    const contentDisposition = buildTempChatContentDisposition(fileName);

    try {
      return noStoreJson({
        provider: 'r2',
        key: filePath,
        uploadUrl: createR2PresignedPutUrl(filePath, {
          expiresIn: UPLOAD_URL_EXPIRES_IN,
          contentDisposition,
        }),
        expiresIn: UPLOAD_URL_EXPIRES_IN,
        contentDisposition,
        fileName,
        fileType,
        fileSize,
      });
    } catch (error) {
      console.error('Could not sign a temp chat upload.', error);
      return noStoreJson({ error: strings.uploadFailed }, { status: 500 });
    }
  }

  const storageConfig = getCloudinaryConfig();

  if (!storageConfig) {
    return noStoreJson({ error: strings.storageUnavailable }, { status: 503 });
  }

  const timestamp = Math.floor(Date.now() / 1_000);

  return noStoreJson({
    provider: 'cloudinary',
    apiKey: storageConfig.apiKey,
    cloudName: storageConfig.cloudName,
    publicId: filePath,
    signature: createCloudinarySignature(
      { public_id: filePath, timestamp },
      storageConfig.apiSecret,
    ),
    timestamp,
    uploadUrl: `https://api.cloudinary.com/v1_1/${storageConfig.cloudName}/auto/upload`,
    fileName,
    fileType,
    fileSize,
  });
}

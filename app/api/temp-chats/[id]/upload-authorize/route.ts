import {
  createCloudinarySignature,
  getCloudinaryConfig,
} from '@/lib/cloudinary-media';
import {
  noStoreJson,
  readJsonObjectBody,
  requireDatabase,
} from '@/lib/api-response';
import {
  buildTempChatPublicId,
  createTempChatFileId,
  getActiveTempChatByCode,
  getTempChatBearerToken,
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
  const storageConfig = getCloudinaryConfig();

  if (!storageConfig) {
    return noStoreJson({ error: strings.storageUnavailable }, { status: 503 });
  }

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

  const publicId = buildTempChatPublicId(chat.id, createTempChatFileId());
  const timestamp = Math.floor(Date.now() / 1_000);

  return noStoreJson({
    apiKey: storageConfig.apiKey,
    cloudName: storageConfig.cloudName,
    fileName,
    fileSize,
    fileType,
    publicId,
    signature: createCloudinarySignature(
      { public_id: publicId, timestamp },
      storageConfig.apiSecret,
    ),
    timestamp,
    uploadUrl: `https://api.cloudinary.com/v1_1/${storageConfig.cloudName}/auto/upload`,
  });
}

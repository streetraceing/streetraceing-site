export const TEMP_CHAT_CODE_PATTERN = /^[A-Za-z0-9_-]{8}$/;
export const TEMP_CHAT_OWNER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const TEMP_CHAT_MEMBER_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export const TEMP_CHAT_MAX_TITLE_LENGTH = 80;
export const TEMP_CHAT_MAX_AUTHOR_NAME_LENGTH = 40;
export const TEMP_CHAT_MAX_MESSAGE_LENGTH = 20_000;
export const TEMP_CHAT_MAX_FILE_NAME_LENGTH = 200;
export const TEMP_CHAT_MAX_FILE_BYTES = 25 * 1_024 * 1_024;

export const TEMP_CHAT_TTL_HOURS = [1, 6, 24, 72, 168] as const;

export type TempChatTtlHours = (typeof TEMP_CHAT_TTL_HOURS)[number];

export const TEMP_CHAT_FILE_PREFIX = 'temp-chat/';

export const TEMP_CHAT_OWNER_COOKIE = 'temp-chat-owner';

export const TEMP_CHAT_RESOURCE_TYPES = ['image', 'video', 'raw'] as const;

export type TempChatResourceType = (typeof TEMP_CHAT_RESOURCE_TYPES)[number];

export function isTempChatResourceType(
  value: unknown,
): value is TempChatResourceType {
  return (
    typeof value === 'string' &&
    (TEMP_CHAT_RESOURCE_TYPES as readonly string[]).includes(value)
  );
}

export function isTempChatTtlHours(value: unknown): value is TempChatTtlHours {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    (TEMP_CHAT_TTL_HOURS as readonly number[]).includes(value)
  );
}

export function getTempChatExpirationDate(createdAt: Date, ttlHours: number) {
  return new Date(createdAt.getTime() + ttlHours * 60 * 60 * 1_000);
}

export function normalizeTempChatAuthorName(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function isTempChatAuthorNameValid(value: string) {
  const normalized = normalizeTempChatAuthorName(value);

  return (
    normalized.length >= 1 &&
    normalized.length <= TEMP_CHAT_MAX_AUTHOR_NAME_LENGTH
  );
}

/** Builds the Cloudinary public id for a chat attachment. */
export function buildTempChatPublicId(chatId: string, fileId: string) {
  return `${TEMP_CHAT_FILE_PREFIX}${chatId}/${fileId}`;
}

/** Only public ids that belong to the given chat may be attached to it. */
export function isTempChatFilePublicId(
  chatId: string,
  value: unknown,
): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith(`${TEMP_CHAT_FILE_PREFIX}${chatId}/`) &&
    value.length > `${TEMP_CHAT_FILE_PREFIX}${chatId}/`.length
  );
}

/** Strips path segments and control characters from a client-supplied file
 * name so it is safe to store and to place into a delivery URL. */
export function sanitizeTempChatFileName(value: string) {
  const baseName = value
    .split(/[\\/]/)
    .pop()
    ?.replace(/[\u0000-\u001f<>:"|?*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!baseName || baseName.replace(/[.\s]/g, '').length === 0) {
    return 'file';
  }

  return baseName.slice(0, TEMP_CHAT_MAX_FILE_NAME_LENGTH);
}

export function formatTempChatFileSize(bytes: number, locale: string) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '';
  }

  if (bytes < 1_024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let scaled = bytes / 1_024;
  let unitIndex = 0;

  while (scaled >= 1_024 && unitIndex < units.length - 1) {
    scaled /= 1_024;
    unitIndex += 1;
  }

  const rounded =
    scaled >= 100 ? Math.round(scaled) : Math.round(scaled * 10) / 10;

  return `${rounded.toLocaleString(locale)} ${units[unitIndex]}`;
}

/** Appends the fl_attachment delivery transformation so the original file
 * name is preserved when the browser downloads the attachment. */
export function buildTempChatDeliveryUrl(url: string, fileName: string) {
  const uploadMarker = '/upload/';

  if (!url.includes(uploadMarker)) {
    return url;
  }

  const attachmentName = fileName.replace(/["\\]/g, '').trim() || 'file';

  return url.replace(
    uploadMarker,
    `${uploadMarker}fl_attachment:${encodeURIComponent(attachmentName)}/`,
  );
}

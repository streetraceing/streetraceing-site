export const TEMP_CHAT_CODE_PATTERN = /^[A-Za-z0-9_-]{8}$/;
export const TEMP_CHAT_OWNER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const TEMP_CHAT_MEMBER_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export const TEMP_CHAT_MAX_TITLE_LENGTH = 80;
export const TEMP_CHAT_MAX_AUTHOR_NAME_LENGTH = 40;
export const TEMP_CHAT_MAX_MESSAGE_LENGTH = 20_000;
export const TEMP_CHAT_MAX_FILE_NAME_LENGTH = 200;
export const TEMP_CHAT_MAX_FILE_BYTES = 20 * 1_024 * 1_024;
export const TEMP_CHAT_MAX_ATTACHMENTS = 10;

export type TempChatStorageDriver = 'cloudinary' | 'r2';

export const TEMP_CHAT_STORAGE_DRIVERS = [
  'cloudinary',
  'r2',
] as const satisfies readonly TempChatStorageDriver[];

export function isTempChatStorageDriver(
  value: unknown,
): value is TempChatStorageDriver {
  return (
    typeof value === 'string' &&
    (TEMP_CHAT_STORAGE_DRIVERS as readonly string[]).includes(value)
  );
}

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

export type TempChatMessageAttachment = {
  provider: 'cloudinary' | 'r2';
  /** Cloudinary public id or R2 object key. */
  path: string;
  /** Permanent Cloudinary delivery URL (null for the R2 driver). */
  url: string | null;
  resourceType: TempChatResourceType | null;
  name: string;
  type: string;
  size: number;
};

export function isTempChatMessageAttachment(
  value: unknown,
): value is TempChatMessageAttachment {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const attachment = value as Record<string, unknown>;

  return (
    (attachment.provider === 'cloudinary' || attachment.provider === 'r2') &&
    typeof attachment.path === 'string' &&
    (typeof attachment.url === 'string' || attachment.url === null) &&
    isTempChatResourceType(attachment.resourceType ?? 'raw') &&
    typeof attachment.name === 'string' &&
    typeof attachment.type === 'string' &&
    typeof attachment.size === 'number'
  );
}

/** Reads the resource type segment from a Cloudinary delivery URL. */
export function getTempChatUrlResourceType(
  value: string,
): TempChatResourceType | undefined {
  try {
    const url = new URL(value);

    if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com') {
      return undefined;
    }

    const resourceType = url.pathname.split('/').filter(Boolean)[1];

    return isTempChatResourceType(resourceType) ? resourceType : undefined;
  } catch {
    return undefined;
  }
}

/** Builds initials for a member avatar, up to two characters. */
export function getTempChatInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => [...part][0]?.toUpperCase() ?? '')
    .join('');

  return initials || '?';
}

export type TempChatMemberTone = {
  /** Author name color, theme-adaptive. */
  name: string;
  /** Translucent bubble background tinted with the member color. */
  bubble: string;
  /** Avatar background, slightly stronger than the bubble tint. */
  avatar: string;
};

export const TEMP_CHAT_MEMBER_TONES: readonly TempChatMemberTone[] = [
  {
    name: 'text-blue-600 dark:text-blue-300',
    bubble: 'bg-blue-500/10',
    avatar: 'bg-blue-500/20',
  },
  {
    name: 'text-emerald-600 dark:text-emerald-300',
    bubble: 'bg-emerald-500/10',
    avatar: 'bg-emerald-500/20',
  },
  {
    name: 'text-amber-600 dark:text-amber-300',
    bubble: 'bg-amber-500/10',
    avatar: 'bg-amber-500/20',
  },
  {
    name: 'text-rose-600 dark:text-rose-300',
    bubble: 'bg-rose-500/10',
    avatar: 'bg-rose-500/20',
  },
  {
    name: 'text-violet-600 dark:text-violet-300',
    bubble: 'bg-violet-500/10',
    avatar: 'bg-violet-500/20',
  },
  {
    name: 'text-cyan-600 dark:text-cyan-300',
    bubble: 'bg-cyan-500/10',
    avatar: 'bg-cyan-500/20',
  },
  {
    name: 'text-orange-600 dark:text-orange-300',
    bubble: 'bg-orange-500/10',
    avatar: 'bg-orange-500/20',
  },
  {
    name: 'text-pink-600 dark:text-pink-300',
    bubble: 'bg-pink-500/10',
    avatar: 'bg-pink-500/20',
  },
];

/** Stable soft color tone for a chat member: one member keeps one tone for
 * the whole chat, in both light and dark themes. */
export function getTempChatMemberTone(memberId: string): TempChatMemberTone {
  let hash = 0;

  for (let index = 0; index < memberId.length; index += 1) {
    hash = (hash * 31 + memberId.charCodeAt(index)) % 2_147_483_647;
  }

  return TEMP_CHAT_MEMBER_TONES[hash % TEMP_CHAT_MEMBER_TONES.length];
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

/** Derives the public id from a Cloudinary delivery URL of a chat attachment.
 * Unlike the project media parser this accepts every resource type and the
 * `temp-chat/` root. Returns undefined for anything else. */
export function getTempChatPublicIdFromUrl(
  value: string,
  expectedCloudName: string,
  expectedResourceType: TempChatResourceType,
) {
  try {
    const url = new URL(value);
    const path = url.pathname.split('/').filter(Boolean);
    const versionIndex = path.findIndex(
      (segment, index) => index > 2 && /^v\d+$/.test(segment),
    );

    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'res.cloudinary.com' ||
      path[0] !== expectedCloudName ||
      path[1] !== expectedResourceType ||
      path[2] !== 'upload' ||
      versionIndex < 0 ||
      versionIndex >= path.length - 1
    ) {
      return undefined;
    }

    const encodedPublicId = path.slice(versionIndex + 1).join('/');
    let publicId: string;

    try {
      publicId = decodeURIComponent(encodedPublicId).replace(
        /\.[a-z0-9]+$/i,
        '',
      );
    } catch {
      return undefined;
    }

    return publicId.startsWith(TEMP_CHAT_FILE_PREFIX) ? publicId : undefined;
  } catch {
    return undefined;
  }
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

/** Builds an ASCII-safe Content-Disposition header used by the R2 driver so
 * the object downloads with the original (transliteration-safe) file name. */
export function buildTempChatContentDisposition(fileName: string) {
  const asciiName =
    fileName
      .replace(/[^\x20-\x7e]/g, '_')
      .replace(/["\\]/g, '_')
      .replace(/\s+/g, ' ')
      .trim() || 'file';

  return `attachment; filename="${asciiName}"`;
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

export const TEMP_CHAT_HISTORY_STORAGE_KEY = 'temp-chat-history';

export type TempChatHistoryEntry = {
  code: string;
  title: string;
  expiresAt: string;
  isOwner: boolean;
  joinedAt: string;
};

export function isTempChatHistoryEntry(
  value: unknown,
): value is TempChatHistoryEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const entry = value as Record<string, unknown>;

  return (
    typeof entry.code === 'string' &&
    TEMP_CHAT_CODE_PATTERN.test(entry.code) &&
    typeof entry.title === 'string' &&
    entry.title.length > 0 &&
    typeof entry.expiresAt === 'string' &&
    !Number.isNaN(new Date(entry.expiresAt).getTime()) &&
    typeof entry.isOwner === 'boolean' &&
    typeof entry.joinedAt === 'string' &&
    !Number.isNaN(new Date(entry.joinedAt).getTime())
  );
}

export function pruneExpiredTempChatHistory(
  entries: TempChatHistoryEntry[],
  now = new Date(),
) {
  const nowMs = now.getTime();

  return entries.filter((entry) => new Date(entry.expiresAt).getTime() > nowMs);
}

/** Upserts an entry by code, keeping the original join time, newest first. */
export function mergeTempChatHistoryEntry(
  entries: TempChatHistoryEntry[],
  entry: TempChatHistoryEntry,
) {
  const existing = entries.find((item) => item.code === entry.code);
  const rest = entries.filter((item) => item.code !== entry.code);
  const merged: TempChatHistoryEntry = {
    ...entry,
    joinedAt: existing?.joinedAt ?? entry.joinedAt,
  };

  return [merged, ...rest].sort((first, second) =>
    second.joinedAt.localeCompare(first.joinedAt),
  );
}

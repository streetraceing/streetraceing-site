import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

export * from '@/utils/temp-chat';

import {
  isTempChatAuthorNameValid,
  isTempChatStorageDriver,
  normalizeTempChatAuthorName,
  TEMP_CHAT_MAX_AUTHOR_NAME_LENGTH,
  TEMP_CHAT_MEMBER_ID_PATTERN,
  TEMP_CHAT_OWNER_COOKIE,
  TEMP_CHAT_OWNER_TOKEN_PATTERN,
  type TempChatStorageDriver,
} from '@/utils/temp-chat';
import { and, eq, gt } from 'drizzle-orm';

import { db } from '@/db';
import { tempChats } from '@/db/schema';

/** Finds a non-expired chat by its share code. */
export async function getActiveTempChatByCode(code: string) {
  const [chat] = await db
    .select()
    .from(tempChats)
    .where(and(eq(tempChats.code, code), gt(tempChats.expiresAt, new Date())))
    .limit(1);

  return chat;
}

/** Resolves the attachment storage driver: the TEMP_CHAT_STORAGE environment
 * variable selects 'r2', everything else falls back to Cloudinary. */
export function getTempChatStorageDriver(): TempChatStorageDriver {
  const configured = process.env.TEMP_CHAT_STORAGE?.trim();

  return isTempChatStorageDriver(configured) ? configured : 'cloudinary';
}

const SCRYPT_KEY_LENGTH = 64;
const MIN_TEMP_CHAT_SECRET_LENGTH = 32;

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keyLength: number,
) => Promise<Buffer>;

export function createTempChatCode() {
  return randomBytes(6).toString('base64url');
}

export function createTempChatOwnerToken() {
  return randomBytes(32).toString('base64url');
}

export function createTempChatMemberId() {
  return randomBytes(16).toString('base64url');
}

export function createTempChatFileId() {
  return randomUUID();
}

export async function hashTempChatPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, SCRYPT_KEY_LENGTH);

  return `scrypt$${salt.toString('base64url')}$${derivedKey.toString('base64url')}`;
}

export async function verifyTempChatPassword(
  password: string,
  storedHash: string,
) {
  const [scheme, encodedSalt, encodedKey] = storedHash.split('$');

  if (scheme !== 'scrypt' || !encodedSalt || !encodedKey) {
    return false;
  }

  const salt = Buffer.from(encodedSalt, 'base64url');
  const expectedKey = Buffer.from(encodedKey, 'base64url');
  const derivedKey = await scrypt(password, salt, expectedKey.length);

  return (
    derivedKey.length === expectedKey.length &&
    timingSafeEqual(derivedKey, expectedKey)
  );
}

const MEMBER_TOKEN_CONTEXT = 'streetraceing:temp-chat-member:v1\0';
const MAX_MEMBER_TOKEN_LENGTH = 1_024;
const MAX_MEMBER_TOKEN_AGE_SECONDS = 7 * 24 * 60 * 60;
const CHAT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type TempChatMemberPayload = {
  purpose: 'temp-chat-member';
  version: 1;
  chatId: string;
  memberId: string;
  name: string;
  iat: number;
  exp: number;
};

function getTempChatSecret() {
  const secret = process.env.AUTH_SECRET?.trim() ?? '';

  return secret.length >= MIN_TEMP_CHAT_SECRET_LENGTH && secret.length <= 4_096
    ? secret
    : undefined;
}

function signMemberPayload(encodedPayload: string, secret: string) {
  return createHmac('sha256', secret)
    .update(MEMBER_TOKEN_CONTEXT)
    .update(encodedPayload)
    .digest('base64url');
}

function isMemberPayload(value: unknown): value is TempChatMemberPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  const now = Math.floor(Date.now() / 1_000);
  return (
    Object.keys(payload).length === 7 &&
    payload.purpose === 'temp-chat-member' &&
    payload.version === 1 &&
    typeof payload.chatId === 'string' &&
    CHAT_ID_PATTERN.test(payload.chatId) &&
    typeof payload.memberId === 'string' &&
    TEMP_CHAT_MEMBER_ID_PATTERN.test(payload.memberId) &&
    typeof payload.name === 'string' &&
    payload.name.length <= TEMP_CHAT_MAX_AUTHOR_NAME_LENGTH &&
    !/\p{Cc}/u.test(payload.name) &&
    normalizeTempChatAuthorName(payload.name) === payload.name &&
    isTempChatAuthorNameValid(payload.name) &&
    typeof payload.iat === 'number' &&
    Number.isSafeInteger(payload.iat) &&
    payload.iat >= 0 &&
    payload.iat <= now &&
    typeof payload.exp === 'number' &&
    Number.isSafeInteger(payload.exp) &&
    payload.exp > now &&
    payload.exp > payload.iat &&
    payload.exp - payload.iat <= MAX_MEMBER_TOKEN_AGE_SECONDS
  );
}

/** Issues an HMAC-signed membership token that stays valid until the chat
 * expires. Polling requests verify this cheap signature instead of running
 * the scrypt password check on every call. */
export function createTempChatMemberToken(
  chatId: string,
  memberId: string,
  name: string,
  expiresAt: Date,
): string | undefined {
  const secret = getTempChatSecret();

  if (!secret) {
    return undefined;
  }

  const payload: TempChatMemberPayload = {
    purpose: 'temp-chat-member',
    version: 1,
    chatId,
    memberId,
    name,
    iat: Math.floor(Date.now() / 1_000),
    exp: Math.floor(expiresAt.getTime() / 1_000),
  };
  if (!isMemberPayload(payload)) {
    return undefined;
  }

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    'base64url',
  );

  return `${encodedPayload}.${signMemberPayload(encodedPayload, secret)}`;
}

export type TempChatMember = {
  memberId: string;
  name: string;
};

export function verifyTempChatMemberToken(
  token: string | undefined,
  chatId: string,
): TempChatMember | undefined {
  const secret = getTempChatSecret();

  if (
    typeof token !== 'string' ||
    token.length > MAX_MEMBER_TOKEN_LENGTH ||
    !secret ||
    typeof chatId !== 'string' ||
    !CHAT_ID_PATTERN.test(chatId)
  ) {
    return undefined;
  }

  const [encodedPayload, signature, ...rest] = token.split('.');

  if (
    !encodedPayload ||
    !/^[A-Za-z0-9_-]+$/.test(encodedPayload) ||
    !signature ||
    !/^[A-Za-z0-9_-]{43}$/.test(signature) ||
    rest.length > 0
  ) {
    return undefined;
  }

  const expectedSignature = signMemberPayload(encodedPayload, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return undefined;
  }

  try {
    const decoded = Buffer.from(encodedPayload, 'base64url');
    if (decoded.toString('base64url') !== encodedPayload) {
      return undefined;
    }

    const payload: unknown = JSON.parse(decoded.toString('utf8'));
    if (!isMemberPayload(payload) || payload.chatId !== chatId) {
      return undefined;
    }

    return { memberId: payload.memberId, name: payload.name };
  } catch {
    return undefined;
  }
}

/** Extracts the Bearer token from an Authorization header. */
export function getTempChatBearerToken(request: Request) {
  const header = request.headers.get('authorization') ?? '';

  return header.startsWith('Bearer ') ? header.slice(7) : undefined;
}

/** Reads the owner token from the httpOnly cookie of a creating browser. */
export function getTempChatOwnerToken(request: Request) {
  const header = request.headers.get('cookie') ?? '';
  const match = header
    .split('; ')
    .find((cookie) => cookie.startsWith(`${TEMP_CHAT_OWNER_COOKIE}=`));
  const value = match?.slice(TEMP_CHAT_OWNER_COOKIE.length + 1);

  return value && TEMP_CHAT_OWNER_TOKEN_PATTERN.test(value) ? value : undefined;
}

export const tempChatOwnerCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

/** Constant-time comparison of an owner token against the stored one. */
export function isTempChatOwnerTokenEqual(
  first: string | undefined,
  second: string | undefined,
) {
  if (!first || !second) {
    return false;
  }

  const firstHash = createHash('sha256').update(first).digest();
  const secondHash = createHash('sha256').update(second).digest();

  return timingSafeEqual(firstHash, secondHash);
}

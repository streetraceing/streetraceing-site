import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

export * from '@/utils/temp-chat';

import {
  isTempChatAuthorNameValid,
  TEMP_CHAT_MEMBER_ID_PATTERN,
  TEMP_CHAT_OWNER_COOKIE,
  TEMP_CHAT_OWNER_TOKEN_PATTERN,
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

type TempChatMemberPayload = {
  chatId: string;
  memberId: string;
  name: string;
  exp: number;
};

function getTempChatSecret() {
  const secret = process.env.AUTH_SECRET?.trim() ?? '';

  return secret.length >= MIN_TEMP_CHAT_SECRET_LENGTH ? secret : undefined;
}

function signMemberPayload(encodedPayload: string, secret: string) {
  return createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');
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
    chatId,
    memberId,
    name,
    exp: Math.floor(expiresAt.getTime() / 1_000),
  };
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

  if (!token || !secret) {
    return undefined;
  }

  const [encodedPayload, signature, ...rest] = token.split('.');

  if (!encodedPayload || !signature || rest.length > 0) {
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
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as TempChatMemberPayload;

    if (
      payload.chatId !== chatId ||
      typeof payload.exp !== 'number' ||
      payload.exp * 1_000 <= Date.now() ||
      !TEMP_CHAT_MEMBER_ID_PATTERN.test(payload.memberId) ||
      !isTempChatAuthorNameValid(payload.name)
    ) {
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

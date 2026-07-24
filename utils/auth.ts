import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import { cookies } from 'next/headers';

const ADMIN_SESSION_COOKIE = 'streetraceing_admin_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const MIN_AUTH_SECRET_LENGTH = 32;

type AdminSessionPayload = {
  exp: number;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  return secret && secret.length >= MIN_AUTH_SECRET_LENGTH ? secret : undefined;
}

function sign(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function safeEqual(first: string, second: string) {
  const firstValue = Buffer.from(first);
  const secondValue = Buffer.from(second);

  return (
    firstValue.length === secondValue.length &&
    timingSafeEqual(firstValue, secondValue)
  );
}

function safePasswordEqual(first: string, second: string) {
  const firstHash = createHash('sha256').update(first).digest();
  const secondHash = createHash('sha256').update(second).digest();
  return timingSafeEqual(firstHash, secondHash);
}

export function isAuthConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD && getAuthSecret());
}

export function isValidAdminPassword(password: string) {
  const expectedPassword = process.env.ADMIN_PASSWORD;

  return Boolean(
    expectedPassword && safePasswordEqual(password, expectedPassword),
  );
}

export function createAdminSessionToken() {
  const secret = getAuthSecret();

  if (!secret) {
    return undefined;
  }

  const payload: AdminSessionPayload = {
    exp: Math.floor(Date.now() / 1_000) + SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    'base64url',
  );

  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function verifyAdminSessionToken(token: string | undefined) {
  const secret = getAuthSecret();

  if (!token || !secret) {
    return false;
  }

  const [encodedPayload, signature, ...rest] = token.split('.');

  if (!encodedPayload || !signature || rest.length > 0) {
    return false;
  }

  if (!safeEqual(signature, sign(encodedPayload, secret))) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as AdminSessionPayload;

    return (
      typeof payload.exp === 'number' &&
      Number.isSafeInteger(payload.exp) &&
      payload.exp > Math.floor(Date.now() / 1_000)
    );
  } catch {
    return false;
  }
}

export async function isAdmin() {
  const cookieStore = await cookies();

  return verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export const adminSessionCookie = {
  name: ADMIN_SESSION_COOKIE,
  maxAge: SESSION_MAX_AGE_SECONDS,
  options: {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
};

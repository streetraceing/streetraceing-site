import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import { cookies } from 'next/headers';

const ADMIN_SESSION_COOKIE = 'streetraceing_admin_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const MIN_ADMIN_PASSWORD_LENGTH = 12;
const MIN_AUTH_SECRET_LENGTH = 32;
const ADMIN_TOKEN_CONTEXT = 'streetraceing:admin-session:v1\0';
const MAX_ADMIN_TOKEN_LENGTH = 512;

type AdminSessionPayload = {
  purpose: 'admin-session';
  version: 1;
  iat: number;
  exp: number;
};

function getAdminPassword() {
  const password = process.env.ADMIN_PASSWORD;
  return password && password.length >= MIN_ADMIN_PASSWORD_LENGTH
    ? password
    : undefined;
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
  return secret &&
    secret.length >= MIN_AUTH_SECRET_LENGTH &&
    secret.length <= 4_096
    ? secret
    : undefined;
}

function sign(payload: string, secret: string) {
  return createHmac('sha256', secret)
    .update(ADMIN_TOKEN_CONTEXT)
    .update(payload)
    .digest('base64url');
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
  return Boolean(getAdminPassword() && getAuthSecret());
}

export function isValidAdminPassword(password: string) {
  const expectedPassword = getAdminPassword();

  return Boolean(
    expectedPassword && safePasswordEqual(password, expectedPassword),
  );
}

export function createAdminSessionToken() {
  const secret = getAuthSecret();

  if (!secret) {
    return undefined;
  }

  const now = Math.floor(Date.now() / 1_000);
  const payload: AdminSessionPayload = {
    purpose: 'admin-session',
    version: 1,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    'base64url',
  );

  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function verifyAdminSessionToken(token: string | undefined) {
  const secret = getAuthSecret();

  if (
    typeof token !== 'string' ||
    token.length > MAX_ADMIN_TOKEN_LENGTH ||
    !secret
  ) {
    return false;
  }

  const [encodedPayload, signature, ...rest] = token.split('.');

  if (
    !encodedPayload ||
    !/^[A-Za-z0-9_-]+$/.test(encodedPayload) ||
    !signature ||
    !/^[A-Za-z0-9_-]{43}$/.test(signature) ||
    rest.length > 0
  ) {
    return false;
  }

  if (!safeEqual(signature, sign(encodedPayload, secret))) {
    return false;
  }

  try {
    const decoded = Buffer.from(encodedPayload, 'base64url');
    if (decoded.toString('base64url') !== encodedPayload) {
      return false;
    }

    const payload: unknown = JSON.parse(decoded.toString('utf8'));
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return false;
    }

    const claims = payload as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1_000);
    return (
      Object.keys(claims).length === 4 &&
      claims.purpose === 'admin-session' &&
      claims.version === 1 &&
      typeof claims.iat === 'number' &&
      Number.isSafeInteger(claims.iat) &&
      claims.iat >= 0 &&
      claims.iat <= now &&
      typeof claims.exp === 'number' &&
      Number.isSafeInteger(claims.exp) &&
      claims.exp > now &&
      claims.exp > claims.iat &&
      claims.exp - claims.iat <= SESSION_MAX_AGE_SECONDS
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

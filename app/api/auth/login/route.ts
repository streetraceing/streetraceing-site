import { NextResponse } from 'next/server';

import {
  adminSessionCookie,
  createAdminSessionToken,
  isAuthConfigured,
  isValidAdminPassword,
} from '@/utils/auth';
import { getRequestLocale, translations } from '@/utils/i18n';
import {
  checkRateLimit,
  getClientAddress,
  getRateLimitHeaders,
  resetRateLimit,
} from '@/utils/rate-limit';

export const runtime = 'nodejs';

const LOGIN_RATE_LIMIT = 5;
const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1_000;
const MAX_LOGIN_BODY_BYTES = 2_048;

function noStoreJson(
  body: unknown,
  init?: ResponseInit,
  additionalHeaders?: Record<string, string>,
) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'no-store');

  for (const [name, value] of Object.entries(additionalHeaders ?? {})) {
    response.headers.set(name, value);
  }

  return response;
}

export async function POST(request: Request) {
  const strings = translations[getRequestLocale(request)].api.auth;
  const rateLimitKey = `auth:login:${getClientAddress(request)}`;
  const rateLimit = checkRateLimit({
    key: rateLimitKey,
    limit: LOGIN_RATE_LIMIT,
    windowMs: LOGIN_RATE_WINDOW_MS,
  });
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return noStoreJson(
      { error: strings.rateLimited },
      { status: 429 },
      rateLimitHeaders,
    );
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');

  if (Number.isFinite(contentLength) && contentLength > MAX_LOGIN_BODY_BYTES) {
    return noStoreJson(
      { error: strings.invalidRequest },
      { status: 413 },
      rateLimitHeaders,
    );
  }

  let password = '';

  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return noStoreJson(
      { error: strings.invalidRequest },
      { status: 400 },
      rateLimitHeaders,
    );
  }

  if (!isAuthConfigured()) {
    return noStoreJson(
      { error: strings.notConfigured },
      { status: 503 },
      rateLimitHeaders,
    );
  }

  if (!isValidAdminPassword(password)) {
    return noStoreJson(
      { error: strings.invalidPassword },
      { status: 401 },
      rateLimitHeaders,
    );
  }

  const token = createAdminSessionToken();

  if (!token) {
    return noStoreJson(
      { error: strings.sessionCreation },
      { status: 503 },
      rateLimitHeaders,
    );
  }

  resetRateLimit(rateLimitKey);

  const response = noStoreJson({ authenticated: true });
  response.cookies.set(
    adminSessionCookie.name,
    token,
    adminSessionCookie.options,
  );

  return response;
}

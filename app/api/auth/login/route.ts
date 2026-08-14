import { isJsonObject, readJsonBody } from '@/lib/api-http';
import { noStoreJson } from '@/lib/api-response';
import {
  adminSessionCookie,
  createAdminSessionToken,
  isAuthConfigured,
  isValidAdminPassword,
} from '@/utils/auth';
import { getRequestLocale, translations } from '@/utils/i18n';
import {
  checkDurableRateLimit,
  getClientAddress,
  getRateLimitHeaders,
  resetDurableRateLimit,
} from '@/utils/rate-limit';

export const runtime = 'nodejs';

const LOGIN_RATE_LIMIT = 5;
const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1_000;
const MAX_LOGIN_BODY_BYTES = 2_048;

export async function POST(request: Request) {
  const strings = translations[getRequestLocale(request)].api.auth;
  const rateLimitKey = `auth:login:${getClientAddress(request)}`;
  const rateLimit = await checkDurableRateLimit({
    key: rateLimitKey,
    limit: LOGIN_RATE_LIMIT,
    windowMs: LOGIN_RATE_WINDOW_MS,
  });
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return noStoreJson(
      { error: strings.rateLimited },
      { status: 429, headers: rateLimitHeaders },
    );
  }

  const bodyResult = await readJsonBody(request, MAX_LOGIN_BODY_BYTES);

  if (!bodyResult.ok || !isJsonObject(bodyResult.value)) {
    return noStoreJson(
      { error: strings.invalidRequest },
      {
        status: bodyResult.ok || bodyResult.reason === 'invalid' ? 400 : 413,
        headers: rateLimitHeaders,
      },
    );
  }

  const password =
    typeof bodyResult.value.password === 'string'
      ? bodyResult.value.password
      : '';

  if (!isAuthConfigured()) {
    return noStoreJson(
      { error: strings.notConfigured },
      { status: 503, headers: rateLimitHeaders },
    );
  }

  if (!isValidAdminPassword(password)) {
    return noStoreJson(
      { error: strings.invalidPassword },
      { status: 401, headers: rateLimitHeaders },
    );
  }

  const token = createAdminSessionToken();

  if (!token) {
    return noStoreJson(
      { error: strings.sessionCreation },
      { status: 503, headers: rateLimitHeaders },
    );
  }

  await resetDurableRateLimit(rateLimitKey);

  const response = noStoreJson({ authenticated: true });
  response.cookies.set(
    adminSessionCookie.name,
    token,
    adminSessionCookie.options,
  );

  return response;
}

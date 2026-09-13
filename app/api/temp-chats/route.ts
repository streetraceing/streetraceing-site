import { db } from '@/db';
import { tempChats } from '@/db/schema';
import {
  noStoreJson,
  readJsonObjectBody,
  requireDatabase,
} from '@/lib/api-response';
import {
  createTempChatCode,
  createTempChatOwnerToken,
  getTempChatOwnerToken,
  getTempChatExpirationDate,
  hashTempChatPassword,
  isTempChatTtlHours,
  normalizeTempChatAuthorName,
  tempChatOwnerCookieOptions,
  TEMP_CHAT_MAX_TITLE_LENGTH,
  TEMP_CHAT_OWNER_COOKIE,
} from '@/lib/temp-chat';
import { getRequestLocale, translations } from '@/utils/i18n';
import { checkDurableRateLimit, getClientAddress } from '@/utils/rate-limit';

export const runtime = 'nodejs';

const CREATE_RATE_LIMIT = 5;
const CREATE_RATE_WINDOW_MS = 30 * 60 * 1_000;
const MAX_CREATE_BODY_BYTES = 4 * 1_024;

function isUniqueViolation(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  );
}

export async function POST(request: Request) {
  const strings = translations[getRequestLocale(request)].tempChat;
  const rateLimit = await checkDurableRateLimit({
    key: `temp-chat:create:${getClientAddress(request)}`,
    limit: CREATE_RATE_LIMIT,
    windowMs: CREATE_RATE_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    return noStoreJson({ error: strings.createRateLimited }, { status: 429 });
  }

  const databaseGuard = requireDatabase(strings.createFailed);
  if (databaseGuard) {
    return databaseGuard;
  }

  const bodyResult = await readJsonObjectBody(request, MAX_CREATE_BODY_BYTES, {
    invalidError: strings.createFailed,
  });

  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  const title = normalizeTempChatAuthorName(
    typeof bodyResult.value.title === 'string' ? bodyResult.value.title : '',
  );

  if (!title || title.length > TEMP_CHAT_MAX_TITLE_LENGTH) {
    return noStoreJson({ error: strings.titleRequired }, { status: 400 });
  }

  if (!isTempChatTtlHours(bodyResult.value.ttlHours)) {
    return noStoreJson({ error: strings.invalidTtl }, { status: 400 });
  }

  const password =
    typeof bodyResult.value.password === 'string'
      ? bodyResult.value.password.trim()
      : '';

  if (password.length > 200) {
    return noStoreJson({ error: strings.passwordTooLong }, { status: 400 });
  }

  const passwordHash = password ? await hashTempChatPassword(password) : null;
  const storedOwnerToken = getTempChatOwnerToken(request);
  const ownerToken = storedOwnerToken ?? createTempChatOwnerToken();
  const ttlHours = bodyResult.value.ttlHours;
  const expiresAt = getTempChatExpirationDate(new Date(), ttlHours);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const [chat] = await db
        .insert(tempChats)
        .values({
          code: createTempChatCode(),
          title,
          passwordHash,
          ttlHours,
          expiresAt,
          ownerToken,
        })
        .returning();

      if (!chat) {
        break;
      }

      const response = noStoreJson(
        {
          code: chat.code,
          expiresAt: chat.expiresAt.toISOString(),
        },
        { status: 201 },
      );

      if (!storedOwnerToken) {
        response.cookies.set(
          TEMP_CHAT_OWNER_COOKIE,
          ownerToken,
          tempChatOwnerCookieOptions,
        );
      }

      return response;
    } catch (error) {
      if (isUniqueViolation(error)) {
        continue;
      }

      console.error('Could not create a temp chat.', error);
      return noStoreJson({ error: strings.createFailed }, { status: 500 });
    }
  }

  return noStoreJson({ error: strings.createFailed }, { status: 500 });
}

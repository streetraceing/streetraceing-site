import {
  noStoreJson,
  readJsonObjectBody,
  requireDatabase,
} from '@/lib/api-response';
import {
  createTempChatMemberId,
  createTempChatMemberToken,
  getActiveTempChatByCode,
  isTempChatAuthorNameValid,
  normalizeTempChatAuthorName,
  verifyTempChatPassword,
  TEMP_CHAT_CODE_PATTERN,
} from '@/lib/temp-chat';
import { getRequestLocale, translations } from '@/utils/i18n';
import { checkDurableRateLimit, getClientAddress } from '@/utils/rate-limit';

export const runtime = 'nodejs';

const JOIN_RATE_LIMIT = 10;
const JOIN_RATE_WINDOW_MS = 10 * 60 * 1_000;
const MAX_JOIN_BODY_BYTES = 4 * 1_024;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!TEMP_CHAT_CODE_PATTERN.test(id)) {
    return noStoreJson({ error: 'Not found.' }, { status: 404 });
  }

  const strings = translations[getRequestLocale(request)].tempChat;
  const rateLimit = await checkDurableRateLimit({
    key: `temp-chat:join:${getClientAddress(request)}`,
    limit: JOIN_RATE_LIMIT,
    windowMs: JOIN_RATE_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    return noStoreJson({ error: strings.joinRateLimited }, { status: 429 });
  }

  const databaseGuard = requireDatabase(strings.joinFailed);
  if (databaseGuard) {
    return databaseGuard;
  }

  const bodyResult = await readJsonObjectBody(request, MAX_JOIN_BODY_BYTES, {
    invalidError: strings.joinFailed,
  });

  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  const name = normalizeTempChatAuthorName(
    typeof bodyResult.value.name === 'string' ? bodyResult.value.name : '',
  );

  if (!isTempChatAuthorNameValid(name)) {
    return noStoreJson({ error: strings.nameRequired }, { status: 400 });
  }

  const chat = await getActiveTempChatByCode(id);

  if (!chat) {
    return noStoreJson({ error: strings.expired }, { status: 404 });
  }

  const password =
    typeof bodyResult.value.password === 'string'
      ? bodyResult.value.password
      : '';

  if (
    chat.passwordHash &&
    !(await verifyTempChatPassword(password, chat.passwordHash))
  ) {
    return noStoreJson({ error: strings.invalidPassword }, { status: 401 });
  }

  const memberId = createTempChatMemberId();
  const token = createTempChatMemberToken(
    chat.id,
    memberId,
    name,
    chat.expiresAt,
  );

  if (!token) {
    return noStoreJson({ error: strings.joinFailed }, { status: 503 });
  }

  return noStoreJson({
    token,
    member: { id: memberId, name },
    chat: {
      title: chat.title,
      expiresAt: chat.expiresAt.toISOString(),
    },
  });
}

import { db } from '@/db';
import { shortUrls } from '@/db/schema';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';

const MAX_URL_LENGTH = 2_048;

function getDestinationUrl(value: unknown) {
  if (typeof value !== 'string' || value.length > MAX_URL_LENGTH) {
    return undefined;
  }

  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function createCode() {
  return randomBytes(6).toString('base64url');
}

export async function POST(request: Request) {
  let body: { url?: unknown };

  try {
    body = (await request.json()) as { url?: unknown };
  } catch {
    return Response.json(
      { error: 'Передай ссылку в JSON-формате.' },
      { status: 400 },
    );
  }

  const destinationUrl = getDestinationUrl(body.url);
  if (!destinationUrl) {
    return Response.json(
      {
        error: 'Укажи корректную ссылку, начинающуюся с http:// или https://.',
      },
      { status: 400 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return Response.json(
      { error: 'База данных не настроена. Проверь DATABASE_URL.' },
      { status: 503 },
    );
  }

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const code = createCode();

      try {
        await db.insert(shortUrls).values({ code, destinationUrl });
        return Response.json(
          { shortUrl: new URL(`/${code}`, request.url).toString() },
          { status: 201 },
        );
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === '23505'
        ) {
          continue;
        }

        throw error;
      }
    }
  } catch {
    return Response.json(
      { error: 'Не удалось сохранить ссылку. Попробуй ещё раз.' },
      { status: 500 },
    );
  }

  return Response.json(
    { error: 'Не удалось подобрать короткий адрес. Попробуй ещё раз.' },
    { status: 500 },
  );
}

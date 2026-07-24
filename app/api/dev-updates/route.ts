import { NextResponse } from 'next/server';

import { db } from '@/db';
import { devUpdates } from '@/db/schema';
import { deleteCloudinaryMedia } from '@/lib/cloudinary-media';
import { readDevUpdatesFeed } from '@/lib/dev-updates';
import { isAdmin } from '@/utils/auth';
import { getRequestLocale, translations } from '@/utils/i18n';
import { MAX_DEV_UPDATE_IMAGES, normalizeMediaUrls } from '@/utils/media';
import { parsePositiveInteger } from '@/utils/numbers';
import { isDevUpdateSort, isDevUpdateTopic } from '@/utils/stats';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const locale = getRequestLocale(request);
  const strings = translations[locale].api.devNotes;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: strings.databaseMissing },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const page = parsePositiveInteger(searchParams.get('page'), 1, 10_000);
  const topicValue = searchParams.get('topic');
  const topic =
    topicValue && isDevUpdateTopic(topicValue) ? topicValue : undefined;
  const sortValue = searchParams.get('sort');
  const sort = sortValue && isDevUpdateSort(sortValue) ? sortValue : 'newest';

  try {
    return NextResponse.json(await readDevUpdatesFeed({ page, topic, sort }));
  } catch {
    return NextResponse.json({ error: strings.loadFailed }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const locale = getRequestLocale(request);
  const apiStrings = translations[locale].api;
  const strings = apiStrings.devNotes;

  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: apiStrings.auth.required },
      { status: 401 },
    );
  }

  let body: {
    title?: unknown;
    content?: unknown;
    topic?: unknown;
    imageUrls?: unknown;
    uploadedImageUrls?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: apiStrings.auth.invalidRequest },
      { status: 400 },
    );
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const topic = typeof body.topic === 'string' ? body.topic : '';
  const imageUrls = normalizeMediaUrls(
    body.imageUrls,
    MAX_DEV_UPDATE_IMAGES,
    process.env.CLOUDINARY_CLOUD_NAME,
  );
  const uploadedImageUrls = normalizeMediaUrls(
    body.uploadedImageUrls,
    MAX_DEV_UPDATE_IMAGES,
    process.env.CLOUDINARY_CLOUD_NAME,
  ).filter((url) => imageUrls.includes(url));

  if (!content || content.length > 8_000 || !isDevUpdateTopic(topic)) {
    await deleteCloudinaryMedia(uploadedImageUrls);
    return NextResponse.json({ error: strings.invalid }, { status: 400 });
  }

  if (title.length > 160) {
    await deleteCloudinaryMedia(uploadedImageUrls);
    return NextResponse.json({ error: strings.titleTooLong }, { status: 400 });
  }

  if (!process.env.DATABASE_URL) {
    await deleteCloudinaryMedia(uploadedImageUrls);
    return NextResponse.json(
      { error: strings.databaseMissing },
      { status: 503 },
    );
  }

  try {
    const [update] = await db
      .insert(devUpdates)
      .values({
        title: title || null,
        content,
        topic,
        imageUrls,
      })
      .returning();

    if (!update) {
      await deleteCloudinaryMedia(uploadedImageUrls);
      return NextResponse.json({ error: strings.saveFailed }, { status: 500 });
    }

    return NextResponse.json({ update }, { status: 201 });
  } catch {
    await deleteCloudinaryMedia(uploadedImageUrls);
    return NextResponse.json({ error: strings.saveFailed }, { status: 500 });
  }
}

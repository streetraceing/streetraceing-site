import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { devUpdates } from '@/db/schema';
import { deleteCloudinaryMedia } from '@/lib/cloudinary-media';
import { isAdmin } from '@/utils/auth';
import { getRequestLocale, translations } from '@/utils/i18n';
import { MAX_DEV_UPDATE_IMAGES, normalizeMediaUrls } from '@/utils/media';
import { isDevUpdateTopic } from '@/utils/stats';

export const runtime = 'nodejs';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getUpdateId(context: RouteContext) {
  const { id } = await context.params;

  return UUID_PATTERN.test(id) ? id : undefined;
}

export async function PATCH(request: Request, context: RouteContext) {
  const locale = getRequestLocale(request);
  const apiStrings = translations[locale].api;
  const strings = apiStrings.devNotes;

  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: apiStrings.auth.required },
      { status: 401 },
    );
  }

  const id = await getUpdateId(context);

  if (!id) {
    return NextResponse.json({ error: strings.notFound }, { status: 404 });
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
    const [previousUpdate] = await db
      .select({ imageUrls: devUpdates.imageUrls })
      .from(devUpdates)
      .where(eq(devUpdates.id, id))
      .limit(1);

    const [update] = await db
      .update(devUpdates)
      .set({ title: title || null, content, topic, imageUrls })
      .where(eq(devUpdates.id, id))
      .returning();

    if (!update) {
      await deleteCloudinaryMedia(uploadedImageUrls);
      return NextResponse.json({ error: strings.notFound }, { status: 404 });
    }

    const removedUrls = (previousUpdate?.imageUrls ?? []).filter(
      (url) => !imageUrls.includes(url),
    );
    await deleteCloudinaryMedia(removedUrls);

    return NextResponse.json({ update });
  } catch {
    await deleteCloudinaryMedia(uploadedImageUrls);
    return NextResponse.json({ error: strings.saveFailed }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const locale = getRequestLocale(request);
  const apiStrings = translations[locale].api;
  const strings = apiStrings.devNotes;

  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: apiStrings.auth.required },
      { status: 401 },
    );
  }

  const id = await getUpdateId(context);

  if (!id) {
    return NextResponse.json({ error: strings.notFound }, { status: 404 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: strings.databaseMissing },
      { status: 503 },
    );
  }

  try {
    const [deletedUpdate] = await db
      .delete(devUpdates)
      .where(eq(devUpdates.id, id))
      .returning({ id: devUpdates.id, imageUrls: devUpdates.imageUrls });

    if (!deletedUpdate) {
      return NextResponse.json({ error: strings.notFound }, { status: 404 });
    }

    await deleteCloudinaryMedia(deletedUpdate.imageUrls);

    return NextResponse.json({ id: deletedUpdate.id });
  } catch {
    return NextResponse.json({ error: strings.deleteFailed }, { status: 500 });
  }
}

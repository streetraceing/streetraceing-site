import { NextResponse } from 'next/server';

import { deleteCloudinaryMedia } from '@/lib/cloudinary-media';
import { isAdmin } from '@/utils/auth';
import { getRequestLocale, translations } from '@/utils/i18n';
import { MAX_MEDIA_IMAGES, normalizeMediaUrls } from '@/utils/media';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const apiStrings = translations[getRequestLocale(request)].api;
  const strings = apiStrings.media;

  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: apiStrings.auth.required },
      { status: 401 },
    );
  }

  let body: { urls?: unknown };

  try {
    body = (await request.json()) as { urls?: unknown };
  } catch {
    return NextResponse.json({ error: strings.invalid }, { status: 400 });
  }

  const urls = normalizeMediaUrls(
    body.urls,
    MAX_MEDIA_IMAGES,
    process.env.CLOUDINARY_CLOUD_NAME,
  );
  const result = await deleteCloudinaryMedia(urls);

  if (result.failed > 0) {
    return NextResponse.json(
      { error: strings.cleanupFailed, ...result },
      { status: 502 },
    );
  }

  return NextResponse.json(result);
}

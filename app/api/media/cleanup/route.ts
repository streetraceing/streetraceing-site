import { NextResponse } from 'next/server';

import { deleteBlobMedia } from '@/lib/blob-media';
import { isAdmin } from '@/utils/auth';
import { getRequestLocale, translations } from '@/utils/i18n';
import { normalizeMediaUrls } from '@/utils/media';

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

  const urls = normalizeMediaUrls(body.urls, 20);
  await deleteBlobMedia(urls);

  return NextResponse.json({ deleted: urls.length });
}

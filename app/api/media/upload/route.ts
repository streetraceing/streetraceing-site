import { NextResponse } from 'next/server';

import {
  createCloudinarySignature,
  getCloudinaryConfig,
} from '@/lib/cloudinary-media';
import { registerPendingMediaUpload } from '@/lib/pending-media-uploads';
import { isAdmin } from '@/utils/auth';
import { mainPageConfig } from '@/utils/config';
import { getRequestLocale, translations } from '@/utils/i18n';
import {
  createMediaPublicId,
  isMediaUploadScope,
  MAX_DEV_UPDATE_IMAGES,
  MAX_MEDIA_IMAGES,
  MAX_PROJECT_IMAGES,
} from '@/utils/media';
import { parseNonNegativeInteger } from '@/utils/numbers';

export const runtime = 'nodejs';

const CLOUDINARY_ALLOWED_FORMATS = 'avif,jpeg,jpg,png,webp';

type UploadAuthorizationRequest = {
  scope?: unknown;
  index?: unknown;
};

export async function POST(request: Request) {
  const apiStrings = translations[getRequestLocale(request)].api;
  const strings = apiStrings.media;

  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: apiStrings.auth.required },
      { status: 401 },
    );
  }

  const config = getCloudinaryConfig();

  if (!config) {
    return NextResponse.json({ error: strings.notConfigured }, { status: 503 });
  }

  let body: UploadAuthorizationRequest;

  try {
    body = (await request.json()) as UploadAuthorizationRequest;
  } catch {
    return NextResponse.json({ error: strings.invalid }, { status: 400 });
  }

  const scope = body.scope;
  const index = parseNonNegativeInteger(body.index, -1, MAX_MEDIA_IMAGES - 1);

  if (!isMediaUploadScope(scope) || index < 0) {
    return NextResponse.json({ error: strings.invalid }, { status: 400 });
  }

  const maximumImages =
    scope.type === 'project' ? MAX_PROJECT_IMAGES : MAX_DEV_UPDATE_IMAGES;

  if (index >= maximumImages) {
    return NextResponse.json({ error: strings.invalid }, { status: 400 });
  }

  if (
    scope.type === 'project' &&
    !mainPageConfig.projects.some(
      (project) => project.slug === scope.projectSlug,
    )
  ) {
    return NextResponse.json({ error: strings.invalid }, { status: 400 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: strings.trackingUnavailable },
      { status: 503 },
    );
  }

  const publicId = createMediaPublicId(scope, index);

  try {
    await registerPendingMediaUpload(publicId);
  } catch (error) {
    console.error('Could not register a pending media upload.', error);
    return NextResponse.json(
      { error: strings.trackingUnavailable },
      { status: 503 },
    );
  }

  const timestamp = Math.floor(Date.now() / 1_000);
  const signature = createCloudinarySignature(
    {
      allowed_formats: CLOUDINARY_ALLOWED_FORMATS,
      overwrite: false,
      public_id: publicId,
      timestamp,
    },
    config.apiSecret,
  );

  return NextResponse.json({
    allowedFormats: CLOUDINARY_ALLOWED_FORMATS,
    apiKey: config.apiKey,
    cloudName: config.cloudName,
    publicId,
    signature,
    timestamp,
  });
}

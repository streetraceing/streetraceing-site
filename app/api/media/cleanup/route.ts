import {
  noStoreJson,
  readJsonObjectBody,
  requireAdminApi,
  requireDatabase,
} from '@/lib/api-response';
import { discardPendingMediaUploads } from '@/lib/pending-media-uploads';
import { getRequestLocale, translations } from '@/utils/i18n';
import { MAX_MEDIA_IMAGES, normalizeMediaUrls } from '@/utils/media';

export const runtime = 'nodejs';

const MAX_MEDIA_CLEANUP_REQUEST_BYTES = 32 * 1_024;

export async function POST(request: Request) {
  const apiStrings = translations[getRequestLocale(request)].api;
  const strings = apiStrings.media;

  const adminGuard = await requireAdminApi(request);
  if (adminGuard) {
    return adminGuard;
  }

  const bodyResult = await readJsonObjectBody(
    request,
    MAX_MEDIA_CLEANUP_REQUEST_BYTES,
    { invalidError: strings.invalid },
  );

  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  const urls = normalizeMediaUrls(
    bodyResult.value.urls,
    MAX_MEDIA_IMAGES,
    process.env.CLOUDINARY_CLOUD_NAME,
  );

  const databaseGuard = requireDatabase(strings.trackingUnavailable);
  if (databaseGuard) {
    return databaseGuard;
  }

  const result = await discardPendingMediaUploads(urls);

  if (result.failed > 0) {
    return noStoreJson(
      { error: strings.cleanupFailed, ...result },
      { status: 502 },
    );
  }

  return noStoreJson(result);
}

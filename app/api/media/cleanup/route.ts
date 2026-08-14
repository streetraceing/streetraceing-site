import { isJsonObject, readJsonBody } from '@/lib/api-http';
import { noStoreJson } from '@/lib/api-response';
import { discardPendingMediaUploads } from '@/lib/pending-media-uploads';
import { isAdmin } from '@/utils/auth';
import { getRequestLocale, translations } from '@/utils/i18n';
import { MAX_MEDIA_IMAGES, normalizeMediaUrls } from '@/utils/media';

export const runtime = 'nodejs';

const MAX_MEDIA_CLEANUP_REQUEST_BYTES = 32 * 1_024;

export async function POST(request: Request) {
  const apiStrings = translations[getRequestLocale(request)].api;
  const strings = apiStrings.media;

  if (!(await isAdmin())) {
    return noStoreJson({ error: apiStrings.auth.required }, { status: 401 });
  }

  const bodyResult = await readJsonBody(
    request,
    MAX_MEDIA_CLEANUP_REQUEST_BYTES,
  );

  if (!bodyResult.ok || !isJsonObject(bodyResult.value)) {
    return noStoreJson(
      { error: strings.invalid },
      {
        status: bodyResult.ok || bodyResult.reason === 'invalid' ? 400 : 413,
      },
    );
  }

  const urls = normalizeMediaUrls(
    bodyResult.value.urls,
    MAX_MEDIA_IMAGES,
    process.env.CLOUDINARY_CLOUD_NAME,
  );
  if (!process.env.DATABASE_URL) {
    return noStoreJson({ error: strings.trackingUnavailable }, { status: 503 });
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

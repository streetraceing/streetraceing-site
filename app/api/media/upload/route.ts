import { isJsonObject, readJsonBody } from '@/lib/api-http';
import { noStoreJson } from '@/lib/api-response';
import {
  createCloudinarySignature,
  getCloudinaryConfig,
} from '@/lib/cloudinary-media';
import { registerPendingMediaUpload } from '@/lib/pending-media-uploads';
import { isAdmin } from '@/utils/auth';
import { getRequestLocale, translations } from '@/utils/i18n';
import {
  createMediaPublicId,
  isMediaUploadScope,
  MAX_DEV_UPDATE_IMAGES,
  MAX_MEDIA_IMAGES,
  MAX_PROJECT_IMAGES,
} from '@/utils/media';
import { parseNonNegativeInteger } from '@/utils/numbers';
import { getProjectBySlug } from '@/utils/project-catalog';

export const runtime = 'nodejs';

const CLOUDINARY_ALLOWED_FORMATS = 'avif,jpeg,jpg,png,webp';
const MAX_UPLOAD_AUTHORIZATION_REQUEST_BYTES = 4 * 1_024;

export async function POST(request: Request) {
  const apiStrings = translations[getRequestLocale(request)].api;
  const strings = apiStrings.media;

  if (!(await isAdmin())) {
    return noStoreJson({ error: apiStrings.auth.required }, { status: 401 });
  }

  const config = getCloudinaryConfig();

  if (!config) {
    return noStoreJson({ error: strings.notConfigured }, { status: 503 });
  }

  const bodyResult = await readJsonBody(
    request,
    MAX_UPLOAD_AUTHORIZATION_REQUEST_BYTES,
  );

  if (!bodyResult.ok || !isJsonObject(bodyResult.value)) {
    return noStoreJson(
      { error: strings.invalid },
      {
        status: bodyResult.ok || bodyResult.reason === 'invalid' ? 400 : 413,
      },
    );
  }

  const scope = bodyResult.value.scope;
  const index = parseNonNegativeInteger(
    bodyResult.value.index,
    -1,
    MAX_MEDIA_IMAGES - 1,
  );

  if (!isMediaUploadScope(scope) || index < 0) {
    return noStoreJson({ error: strings.invalid }, { status: 400 });
  }

  const maximumImages =
    scope.type === 'project' ? MAX_PROJECT_IMAGES : MAX_DEV_UPDATE_IMAGES;

  if (index >= maximumImages) {
    return noStoreJson({ error: strings.invalid }, { status: 400 });
  }

  if (scope.type === 'project' && !getProjectBySlug(scope.projectSlug)) {
    return noStoreJson({ error: strings.invalid }, { status: 400 });
  }

  if (!process.env.DATABASE_URL) {
    return noStoreJson({ error: strings.trackingUnavailable }, { status: 503 });
  }

  const publicId = createMediaPublicId(scope, index);

  try {
    await registerPendingMediaUpload(publicId);
  } catch (error) {
    console.error('Could not register a pending media upload.', error);
    return noStoreJson({ error: strings.trackingUnavailable }, { status: 503 });
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

  return noStoreJson({
    allowedFormats: CLOUDINARY_ALLOWED_FORMATS,
    apiKey: config.apiKey,
    cloudName: config.cloudName,
    publicId,
    signature,
    timestamp,
  });
}

export const MEDIA_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

export const MAX_MEDIA_SOURCE_BYTES = 10 * 1024 * 1024;
export const MAX_DEV_UPDATE_IMAGES = 4;
export const MAX_PROJECT_IMAGES = 8;

const CLOUDINARY_HOSTNAME = 'res.cloudinary.com';
const CLOUDINARY_MEDIA_ROOT = 'streetraceing/media';

export type MediaUploadScope =
  { type: 'dev-update' } | { type: 'project'; projectSlug: string };

export function isAllowedMediaType(value: string) {
  return MEDIA_ALLOWED_TYPES.includes(
    value as (typeof MEDIA_ALLOWED_TYPES)[number],
  );
}

export function isMediaUploadScope(value: unknown): value is MediaUploadScope {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const scope = value as { type?: unknown; projectSlug?: unknown };

  if (scope.type === 'dev-update') {
    return true;
  }

  return (
    scope.type === 'project' &&
    typeof scope.projectSlug === 'string' &&
    /^[a-z0-9-]{1,64}$/.test(scope.projectSlug)
  );
}

export function getMediaPublicIdPrefix(scope: MediaUploadScope) {
  return scope.type === 'project'
    ? `${CLOUDINARY_MEDIA_ROOT}/projects/${scope.projectSlug}/`
    : `${CLOUDINARY_MEDIA_ROOT}/dev-updates/`;
}

export function createMediaPublicId(scope: MediaUploadScope, index: number) {
  return `${getMediaPublicIdPrefix(scope)}${Date.now()}-${index}-${crypto.randomUUID()}`;
}

function getCloudinaryUrlParts(value: string, expectedCloudName?: string) {
  try {
    const url = new URL(value);
    const path = url.pathname.split('/').filter(Boolean);
    const cloudName = path[0];
    const resourceType = path[1];
    const deliveryType = path[2];
    const versionIndex = path.findIndex(
      (segment, index) => index > 2 && /^v\d+$/.test(segment),
    );

    if (
      url.protocol !== 'https:' ||
      url.hostname !== CLOUDINARY_HOSTNAME ||
      !cloudName ||
      (expectedCloudName && cloudName !== expectedCloudName) ||
      resourceType !== 'image' ||
      deliveryType !== 'upload' ||
      versionIndex < 0 ||
      versionIndex >= path.length - 1
    ) {
      return undefined;
    }

    return { url, path, cloudName, versionIndex };
  } catch {
    return undefined;
  }
}

function addCloudinaryTransformation(value: string, transformation: string) {
  const parsed = getCloudinaryUrlParts(value);

  if (!parsed) {
    return value;
  }

  const nextPath = [...parsed.path];

  nextPath.splice(3, parsed.versionIndex - 3, transformation);
  parsed.url.pathname = `/${nextPath.join('/')}`;

  return parsed.url.toString();
}

export function getCloudinaryPublicIdFromUrl(
  value: string,
  expectedCloudName?: string,
) {
  const parsed = getCloudinaryUrlParts(value, expectedCloudName);

  if (!parsed) {
    return undefined;
  }

  const assetPath = parsed.path.slice(parsed.versionIndex + 1);
  const encodedPublicId = assetPath.join('/');
  let publicId: string;

  try {
    publicId = decodeURIComponent(encodedPublicId).replace(/\.[a-z0-9]+$/i, '');
  } catch {
    return undefined;
  }

  return publicId.startsWith(`${CLOUDINARY_MEDIA_ROOT}/`)
    ? publicId
    : undefined;
}

export function getCloudinarySquareImageUrl(value: string, size: number) {
  const normalizedSize = Number.isFinite(size)
    ? Math.min(1_080, Math.max(64, Math.round(size)))
    : 1_080;

  return addCloudinaryTransformation(
    value,
    `c_fill,g_auto,h_${normalizedSize},w_${normalizedSize},q_auto:good,f_auto`,
  );
}

export function getCloudinaryImageInfoUrl(value: string) {
  return addCloudinaryTransformation(value, 'fl_getinfo');
}

export function getCloudinaryDownloadUrl(value: string) {
  return addCloudinaryTransformation(value, 'fl_attachment');
}

export function isCloudinaryMediaUrl(value: string) {
  return Boolean(getCloudinaryPublicIdFromUrl(value));
}

export function normalizeMediaUrls(
  value: unknown,
  maximum: number,
  expectedCloudName?: string,
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value)]
    .filter(
      (item): item is string =>
        typeof item === 'string' &&
        Boolean(getCloudinaryPublicIdFromUrl(item, expectedCloudName)),
    )
    .slice(0, maximum);
}

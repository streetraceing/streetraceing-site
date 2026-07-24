export const MEDIA_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

export const MAX_MEDIA_SOURCE_BYTES = 10 * 1024 * 1024;
export const MAX_MEDIA_UPLOAD_BYTES = 1_500_000;
export const MAX_DEV_UPDATE_IMAGES = 4;
export const MAX_PROJECT_IMAGES = 8;
export const MAX_IMAGE_DIMENSION = 1_440;

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

export function getCloudinaryPublicIdFromUrl(
  value: string,
  expectedCloudName?: string,
) {
  try {
    const url = new URL(value);
    const path = url.pathname.split('/').filter(Boolean);
    const [cloudName, resourceType, deliveryType, version, ...assetPath] = path;

    if (
      url.protocol !== 'https:' ||
      url.hostname !== CLOUDINARY_HOSTNAME ||
      !cloudName ||
      (expectedCloudName && cloudName !== expectedCloudName) ||
      resourceType !== 'image' ||
      deliveryType !== 'upload' ||
      !/^v\d+$/.test(version ?? '') ||
      assetPath.length === 0
    ) {
      return undefined;
    }

    const encodedPublicId = assetPath.join('/');
    const publicId = decodeURIComponent(encodedPublicId).replace(
      /\.webp$/i,
      '',
    );

    return publicId.startsWith(`${CLOUDINARY_MEDIA_ROOT}/`)
      ? publicId
      : undefined;
  } catch {
    return undefined;
  }
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

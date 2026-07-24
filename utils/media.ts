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

export type MediaUploadScope =
  { type: 'dev-update' } | { type: 'project'; projectSlug: string };

export function isAllowedMediaType(value: string) {
  return MEDIA_ALLOWED_TYPES.includes(
    value as (typeof MEDIA_ALLOWED_TYPES)[number],
  );
}

export function isVercelBlobMediaUrl(value: string) {
  try {
    const url = new URL(value);

    return (
      url.protocol === 'https:' &&
      url.hostname.endsWith('.public.blob.vercel-storage.com')
    );
  } catch {
    return false;
  }
}

export function normalizeMediaUrls(value: unknown, maximum: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  const urls = [...new Set(value)]
    .filter(
      (item): item is string =>
        typeof item === 'string' && isVercelBlobMediaUrl(item),
    )
    .slice(0, maximum);

  return urls;
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

export function getMediaPathPrefix(scope: MediaUploadScope) {
  return scope.type === 'project'
    ? `media/projects/${scope.projectSlug}/`
    : 'media/dev-updates/';
}

export function createMediaPathname(scope: MediaUploadScope, index: number) {
  const randomPart = crypto.randomUUID();

  return `${getMediaPathPrefix(scope)}${Date.now()}-${index}-${randomPart}.webp`;
}

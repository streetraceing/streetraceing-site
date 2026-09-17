export const MEDIA_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

export const MAX_MEDIA_SOURCE_BYTES = 10 * 1024 * 1024;
export const MAX_MEDIA_IMAGES = 20;
export const MAX_DEV_UPDATE_IMAGES = MAX_MEDIA_IMAGES;
export const MAX_PROJECT_IMAGES = MAX_MEDIA_IMAGES;

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
    if (value.length > 2_048 || /[\\\p{Cc}]/u.test(value)) {
      return undefined;
    }

    const url = new URL(value);
    const path = url.pathname.slice(1).split('/');
    const cloudName = path[0];
    const resourceType = path[1];
    const deliveryType = path[2];
    const versionIndex = path.findIndex(
      (segment, index) => index > 2 && /^v\d+$/.test(segment),
    );

    if (
      url.protocol !== 'https:' ||
      url.hostname !== CLOUDINARY_HOSTNAME ||
      url.port !== '' ||
      url.username !== '' ||
      url.password !== '' ||
      path.some((segment) => !segment) ||
      !cloudName ||
      !/^[a-z0-9_-]{1,128}$/i.test(cloudName) ||
      (expectedCloudName && cloudName !== expectedCloudName.trim()) ||
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
  let publicId: string;

  try {
    const segments = assetPath.map((segment) => decodeURIComponent(segment));
    if (
      segments.some(
        (segment) =>
          !segment ||
          segment === '.' ||
          segment === '..' ||
          /[/\\%?#\p{Cc}]/u.test(segment),
      )
    ) {
      return undefined;
    }
    publicId = segments.join('/').replace(/\.[a-z0-9]+$/i, '');
  } catch {
    return undefined;
  }

  return publicId.startsWith(`${CLOUDINARY_MEDIA_ROOT}/`) &&
    publicId.length <= 255 &&
    !publicId.endsWith('/')
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

export function getMediaAssetIdentity(
  value: string,
  expectedCloudName?: string,
) {
  const parsed = getCloudinaryUrlParts(value, expectedCloudName);
  const publicId = getCloudinaryPublicIdFromUrl(value, expectedCloudName);
  return parsed && publicId
    ? `${parsed.cloudName}/image/upload/${publicId}`
    : undefined;
}

/** Mutation input is all-or-nothing; only an explicit empty array clears media. */
export function parseMediaUrls(
  value: unknown,
  maximum: number,
  expectedCloudName?: string,
): string[] | undefined {
  if (
    !Array.isArray(value) ||
    value.length > maximum ||
    (value.length > 0 && !expectedCloudName?.trim())
  ) {
    return undefined;
  }

  const urls: string[] = [];
  const identities = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') {
      return undefined;
    }
    const parsed = getCloudinaryUrlParts(item, expectedCloudName);
    const identity = getMediaAssetIdentity(item, expectedCloudName);
    if (!parsed || !identity || parsed.url.search || parsed.url.hash) {
      return undefined;
    }

    const originalPath = parsed.path.slice(parsed.versionIndex);
    parsed.url.pathname = `/${parsed.cloudName}/image/upload/${originalPath
      .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
      .join('/')}`;
    if (!identities.has(identity)) {
      identities.add(identity);
      urls.push(parsed.url.href);
    }
  }
  return urls;
}

export function getRemovedMediaUrls(
  previous: string[],
  next: string[],
  expectedCloudName?: string,
) {
  const retained = new Set(
    next.map((url) => getMediaAssetIdentity(url, expectedCloudName)),
  );
  return previous.filter((url) => {
    const identity = getMediaAssetIdentity(url, expectedCloudName);
    return identity && !retained.has(identity);
  });
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

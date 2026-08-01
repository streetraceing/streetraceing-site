import { createHash } from 'node:crypto';

import { getCloudinaryPublicIdFromUrl } from '@/utils/media';

type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

type CloudinarySignatureValue = boolean | number | string;

type CloudinaryDestroyResponse = {
  result?: unknown;
  error?: { message?: unknown };
};

export type CloudinaryDeleteResult = {
  requested: number;
  deleted: number;
  notFound: number;
  failed: number;
};

export type CloudinaryPublicIdDeleteResult = CloudinaryDeleteResult & {
  completedPublicIds: string[];
};

const CLOUDINARY_DELETE_CONCURRENCY = 5;

export function getCloudinaryConfig(): CloudinaryConfig | undefined {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    return undefined;
  }

  return { cloudName, apiKey, apiSecret };
}

export function createCloudinarySignature(
  parameters: Record<string, CloudinarySignatureValue>,
  apiSecret: string,
) {
  const serializedParameters = Object.entries(parameters)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('&');

  return createHash('sha1')
    .update(`${serializedParameters}${apiSecret}`)
    .digest('hex');
}

async function deleteCloudinaryAsset(
  config: CloudinaryConfig,
  publicId: string,
): Promise<'deleted' | 'not-found'> {
  const timestamp = Math.floor(Date.now() / 1_000);
  const parameters = {
    invalidate: true,
    public_id: publicId,
    timestamp,
  };
  const body = new FormData();

  body.set('api_key', config.apiKey);
  body.set('invalidate', 'true');
  body.set('public_id', publicId);
  body.set(
    'signature',
    createCloudinarySignature(parameters, config.apiSecret),
  );
  body.set('timestamp', String(timestamp));

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/destroy`,
    {
      method: 'POST',
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    },
  );
  const result = (await response
    .json()
    .catch(() => ({}))) as CloudinaryDestroyResponse;
  const destroyResult =
    typeof result.result === 'string' ? result.result.toLowerCase() : undefined;

  if (!response.ok) {
    const message =
      typeof result.error?.message === 'string'
        ? result.error.message
        : `Cloudinary returned HTTP ${response.status}.`;

    throw new Error(message);
  }

  if (destroyResult === 'ok') {
    return 'deleted';
  }

  if (destroyResult === 'not found') {
    return 'not-found';
  }

  throw new Error('Cloudinary returned an unexpected destroy result.');
}

export async function deleteCloudinaryPublicIds(
  values: string[],
): Promise<CloudinaryPublicIdDeleteResult> {
  const publicIds = [...new Set(values.filter(Boolean))];
  const config = getCloudinaryConfig();

  if (!config) {
    if (publicIds.length > 0) {
      console.error(
        'Cloudinary deletion is unavailable because its credentials are incomplete.',
      );
    }

    return {
      requested: publicIds.length,
      deleted: 0,
      notFound: 0,
      failed: publicIds.length,
      completedPublicIds: [],
    };
  }

  const outcomes = new Map<string, 'deleted' | 'failed' | 'not-found'>();
  let nextIndex = 0;

  async function deleteNextAsset() {
    while (nextIndex < publicIds.length) {
      const index = nextIndex;
      nextIndex += 1;
      const publicId = publicIds[index];

      if (!publicId) {
        continue;
      }

      try {
        outcomes.set(publicId, await deleteCloudinaryAsset(config, publicId));
      } catch (error) {
        console.error(
          `Could not delete Cloudinary asset "${publicId}".`,
          error,
        );
        outcomes.set(publicId, 'failed');
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(CLOUDINARY_DELETE_CONCURRENCY, publicIds.length) },
      () => deleteNextAsset(),
    ),
  );

  const completedPublicIds = publicIds.filter(
    (publicId) => outcomes.get(publicId) !== 'failed',
  );

  return {
    requested: publicIds.length,
    deleted: publicIds.filter(
      (publicId) => outcomes.get(publicId) === 'deleted',
    ).length,
    notFound: publicIds.filter(
      (publicId) => outcomes.get(publicId) === 'not-found',
    ).length,
    failed: publicIds.filter((publicId) => outcomes.get(publicId) === 'failed')
      .length,
    completedPublicIds,
  };
}

export async function deleteCloudinaryMedia(
  urls: string[],
): Promise<CloudinaryDeleteResult> {
  const config = getCloudinaryConfig();

  if (!config) {
    const requested = new Set(urls).size;

    if (requested > 0) {
      console.error(
        'Cloudinary deletion is unavailable because its credentials are incomplete.',
      );
    }

    return { requested, deleted: 0, notFound: 0, failed: requested };
  }

  const publicIds = [
    ...new Set(
      urls
        .map((url) => getCloudinaryPublicIdFromUrl(url, config.cloudName))
        .filter((publicId): publicId is string => Boolean(publicId)),
    ),
  ];
  const deletionResult = await deleteCloudinaryPublicIds(publicIds);

  return {
    requested: deletionResult.requested,
    deleted: deletionResult.deleted,
    notFound: deletionResult.notFound,
    failed: deletionResult.failed,
  };
}

import { createHash } from 'node:crypto';

import { isJsonObject, readJsonResponse } from '@/utils/json';
import { getCloudinaryPublicIdFromUrl } from '@/utils/media';

type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

type CloudinarySignatureValue = boolean | number | string;

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

export type CloudinaryResourceType = 'image' | 'video' | 'raw';

async function deleteCloudinaryAsset(
  config: CloudinaryConfig,
  publicId: string,
  resourceType: CloudinaryResourceType,
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
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/${resourceType}/destroy`,
    {
      method: 'POST',
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    },
  );
  const result = await readJsonResponse(response);
  const destroyResult =
    isJsonObject(result) && typeof result.result === 'string'
      ? result.result.toLowerCase()
      : undefined;

  if (!response.ok) {
    const error = isJsonObject(result) ? result.error : undefined;
    const message =
      isJsonObject(error) && typeof error.message === 'string'
        ? error.message
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

export type CloudinaryPublicIdEntry = {
  publicId: string;
  resourceType?: CloudinaryResourceType;
};

export async function deleteCloudinaryPublicIds(
  entries: CloudinaryPublicIdEntry[],
): Promise<CloudinaryPublicIdDeleteResult> {
  const publicIdEntries = entries.filter((entry) => Boolean(entry.publicId));
  const config = getCloudinaryConfig();

  if (!config) {
    if (publicIdEntries.length > 0) {
      console.error(
        'Cloudinary deletion is unavailable because its credentials are incomplete.',
      );
    }

    return {
      requested: publicIdEntries.length,
      deleted: 0,
      notFound: 0,
      failed: publicIdEntries.length,
      completedPublicIds: [],
    };
  }

  const outcomes = new Map<string, 'deleted' | 'failed' | 'not-found'>();
  let nextIndex = 0;

  async function deleteNextAsset() {
    while (nextIndex < publicIdEntries.length) {
      const index = nextIndex;
      nextIndex += 1;
      const entry = publicIdEntries[index];

      if (!entry) {
        continue;
      }

      if (!config) {
        throw new Error('Cloudinary configuration is missing');
      }

      try {
        outcomes.set(
          entry.publicId,
          await deleteCloudinaryAsset(
            config,
            entry.publicId,
            entry.resourceType ?? 'image',
          ),
        );
      } catch (error) {
        console.error(
          `Could not delete Cloudinary asset "${entry.publicId}".`,
          error,
        );
        outcomes.set(entry.publicId, 'failed');
      }
    }
  }

  await Promise.all(
    Array.from(
      {
        length: Math.min(CLOUDINARY_DELETE_CONCURRENCY, publicIdEntries.length),
      },
      () => deleteNextAsset(),
    ),
  );

  const completedPublicIds = publicIdEntries
    .map((entry) => entry.publicId)
    .filter((publicId) => outcomes.get(publicId) !== 'failed');

  return {
    requested: publicIdEntries.length,
    deleted: publicIdEntries.filter(
      (entry) => outcomes.get(entry.publicId) === 'deleted',
    ).length,
    notFound: publicIdEntries.filter(
      (entry) => outcomes.get(entry.publicId) === 'not-found',
    ).length,
    failed: publicIdEntries.filter(
      (entry) => outcomes.get(entry.publicId) === 'failed',
    ).length,
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
  const deletionResult = await deleteCloudinaryPublicIds(
    publicIds.map((publicId) => ({ publicId, resourceType: 'image' as const })),
  );

  return {
    requested: deletionResult.requested,
    deleted: deletionResult.deleted,
    notFound: deletionResult.notFound,
    failed: deletionResult.failed,
  };
}

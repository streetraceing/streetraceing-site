import { createHash } from 'node:crypto';

import { getCloudinaryPublicIdFromUrl } from '@/utils/media';

type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

type CloudinarySignatureValue = boolean | number | string;

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
) {
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

  await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/destroy`,
    {
      method: 'POST',
      body,
      cache: 'no-store',
    },
  );
}

export async function deleteCloudinaryMedia(urls: string[]) {
  const config = getCloudinaryConfig();

  if (!config) {
    return;
  }

  const publicIds = [
    ...new Set(
      urls
        .map((url) => getCloudinaryPublicIdFromUrl(url, config.cloudName))
        .filter((publicId): publicId is string => Boolean(publicId)),
    ),
  ];

  await Promise.allSettled(
    publicIds.map((publicId) => deleteCloudinaryAsset(config, publicId)),
  );
}

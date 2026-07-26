'use client';

import {
  getCloudinaryPublicIdFromUrl,
  type MediaUploadScope,
} from '@/utils/media';

type CloudinaryUploadAuthorization = {
  allowedFormats: string;
  apiKey: string;
  cloudName: string;
  publicId: string;
  signature: string;
  timestamp: number;
  error?: string;
};

type CloudinaryUploadResponse = {
  public_id?: string;
  secure_url?: string;
  error?: { message?: string };
};

async function requestUploadAuthorization(
  scope: MediaUploadScope,
  index: number,
) {
  const response = await fetch('/api/media/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope, index }),
  });
  const body = (await response.json()) as CloudinaryUploadAuthorization;

  if (
    !response.ok ||
    !body.allowedFormats ||
    !body.apiKey ||
    !body.cloudName ||
    !body.publicId ||
    !body.signature ||
    !body.timestamp
  ) {
    throw new Error(body.error ?? 'Could not authorize the image upload.');
  }

  return body;
}

async function uploadOriginalFile(
  file: File,
  authorization: CloudinaryUploadAuthorization,
) {
  const body = new FormData();

  body.set('allowed_formats', authorization.allowedFormats);
  body.set('api_key', authorization.apiKey);
  body.set('file', file);
  body.set('overwrite', 'false');
  body.set('public_id', authorization.publicId);
  body.set('signature', authorization.signature);
  body.set('timestamp', String(authorization.timestamp));

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(authorization.cloudName)}/image/upload`,
    { method: 'POST', body },
  );
  const result = (await response.json()) as CloudinaryUploadResponse;
  const url = result.secure_url;

  if (
    !response.ok ||
    !url ||
    result.public_id !== authorization.publicId ||
    getCloudinaryPublicIdFromUrl(url, authorization.cloudName) !==
      authorization.publicId
  ) {
    throw new Error(result.error?.message ?? 'Could not upload the image.');
  }

  return url;
}

export async function uploadMediaFiles(files: File[], scope: MediaUploadScope) {
  const uploadedUrls = new Array<string | undefined>(files.length);
  const maximumConcurrency = Math.min(3, files.length);
  let nextIndex = 0;
  let firstError: unknown;

  async function uploadNextFile() {
    while (!firstError) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= files.length) {
        return;
      }

      const file = files[index];

      if (!file) {
        return;
      }

      try {
        const authorization = await requestUploadAuthorization(scope, index);
        uploadedUrls[index] = await uploadOriginalFile(file, authorization);
      } catch (error) {
        firstError = error;
      }
    }
  }

  await Promise.all(
    Array.from({ length: maximumConcurrency }, () => uploadNextFile()),
  );

  const completedUrls = uploadedUrls.filter(
    (url): url is string => typeof url === 'string',
  );

  if (firstError) {
    await cleanupUploadedMedia(completedUrls);
    throw firstError;
  }

  return completedUrls;
}

export async function cleanupUploadedMedia(urls: string[]) {
  if (urls.length === 0) {
    return;
  }

  try {
    const response = await fetch('/api/media/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
    });

    if (!response.ok) {
      console.error('Could not clean up uploaded media.');
    }
  } catch (error) {
    console.error('Could not clean up uploaded media.', error);
    // Cleanup is best-effort. The saved database record remains the source of truth.
  }
}

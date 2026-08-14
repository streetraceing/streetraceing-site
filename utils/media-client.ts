'use client';

import {
  getCloudinaryPublicIdFromUrl,
  type MediaUploadScope,
} from '@/utils/media';
import { getJsonError, isJsonObject, readJsonResponse } from '@/utils/json';

type CloudinaryUploadAuthorization = {
  allowedFormats: string;
  apiKey: string;
  cloudName: string;
  publicId: string;
  signature: string;
  timestamp: number;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

async function requestUploadAuthorization(
  scope: MediaUploadScope,
  index: number,
  fallbackError: string,
) {
  const response = await fetch('/api/media/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope, index }),
  });
  const body = await readJsonResponse(response);

  if (
    !response.ok ||
    !isJsonObject(body) ||
    !isNonEmptyString(body.allowedFormats) ||
    !isNonEmptyString(body.apiKey) ||
    !isNonEmptyString(body.cloudName) ||
    !isNonEmptyString(body.publicId) ||
    !isNonEmptyString(body.signature) ||
    typeof body.timestamp !== 'number' ||
    !Number.isSafeInteger(body.timestamp)
  ) {
    throw new Error(getJsonError(body) ?? fallbackError);
  }

  return {
    allowedFormats: body.allowedFormats,
    apiKey: body.apiKey,
    cloudName: body.cloudName,
    publicId: body.publicId,
    signature: body.signature,
    timestamp: body.timestamp,
  } satisfies CloudinaryUploadAuthorization;
}

async function uploadOriginalFile(
  file: File,
  authorization: CloudinaryUploadAuthorization,
  fallbackError: string,
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
  const result = await readJsonResponse(response);
  const url = isJsonObject(result) ? result.secure_url : undefined;

  if (
    !response.ok ||
    !isNonEmptyString(url) ||
    !isJsonObject(result) ||
    result.public_id !== authorization.publicId ||
    getCloudinaryPublicIdFromUrl(url, authorization.cloudName) !==
      authorization.publicId
  ) {
    throw new Error(fallbackError);
  }

  return url;
}

export async function uploadMediaFiles(
  files: File[],
  scope: MediaUploadScope,
  fallbackError: string,
) {
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
        const authorization = await requestUploadAuthorization(
          scope,
          index,
          fallbackError,
        );
        uploadedUrls[index] = await uploadOriginalFile(
          file,
          authorization,
          fallbackError,
        );
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

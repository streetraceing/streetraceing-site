'use client';

import {
  getCloudinaryPublicIdFromUrl,
  MAX_IMAGE_DIMENSION,
  MAX_MEDIA_UPLOAD_BYTES,
  type MediaUploadScope,
} from '@/utils/media';

const MEDIA_OPTIMIZATION_ERROR = 'media-optimization-failed';

type CloudinaryUploadAuthorization = {
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

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/webp', quality);
  });
}

async function optimizeImage(file: File) {
  if (typeof createImageBitmap !== 'function') {
    throw new Error(MEDIA_OPTIMIZATION_ERROR);
  }

  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(MEDIA_OPTIMIZATION_ERROR);
  }

  const scale = Math.min(
    1,
    MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height),
  );
  const canvas = document.createElement('canvas');

  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const context = canvas.getContext('2d', { alpha: true });

  if (!context) {
    bitmap.close();
    throw new Error(MEDIA_OPTIMIZATION_ERROR);
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const quality of [0.84, 0.74, 0.64, 0.54]) {
    const blob = await canvasToBlob(canvas, quality);

    if (blob && blob.size <= MAX_MEDIA_UPLOAD_BYTES) {
      const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';

      return new File([blob], `${baseName}.webp`, {
        type: 'image/webp',
        lastModified: Date.now(),
      });
    }
  }

  throw new Error(MEDIA_OPTIMIZATION_ERROR);
}

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

async function uploadOptimizedFile(
  file: File,
  authorization: CloudinaryUploadAuthorization,
) {
  const body = new FormData();

  body.set('api_key', authorization.apiKey);
  body.set('file', file);
  body.set('format', 'webp');
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

export async function uploadMediaFiles(
  files: File[],
  scope: MediaUploadScope,
  optimizationErrorMessage: string,
) {
  const uploadedUrls: string[] = [];

  try {
    for (const [index, file] of files.entries()) {
      const optimizedFile = await optimizeImage(file);
      const authorization = await requestUploadAuthorization(scope, index);
      const url = await uploadOptimizedFile(optimizedFile, authorization);

      uploadedUrls.push(url);
    }

    return uploadedUrls;
  } catch (error) {
    await cleanupUploadedMedia(uploadedUrls);

    if (error instanceof Error && error.message === MEDIA_OPTIMIZATION_ERROR) {
      throw new Error(optimizationErrorMessage);
    }

    throw error;
  }
}

export async function cleanupUploadedMedia(urls: string[]) {
  if (urls.length === 0) {
    return;
  }

  try {
    await fetch('/api/media/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
    });
  } catch {
    // Cleanup is best-effort. The saved database record remains the source of truth.
  }
}

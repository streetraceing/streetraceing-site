'use client';

import { upload } from '@vercel/blob/client';

import {
  createMediaPathname,
  MAX_IMAGE_DIMENSION,
  MAX_MEDIA_UPLOAD_BYTES,
  type MediaUploadScope,
} from '@/utils/media';

const MEDIA_OPTIMIZATION_ERROR = 'media-optimization-failed';

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

export async function uploadMediaFiles(
  files: File[],
  scope: MediaUploadScope,
  optimizationErrorMessage: string,
) {
  const uploadedUrls: string[] = [];

  try {
    for (const [index, file] of files.entries()) {
      const optimizedFile = await optimizeImage(file);
      const blob = await upload(
        createMediaPathname(scope, index),
        optimizedFile,
        {
          access: 'public',
          handleUploadUrl: '/api/media/upload',
          clientPayload: JSON.stringify(scope),
        },
      );

      uploadedUrls.push(blob.url);
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

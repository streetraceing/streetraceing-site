import { del } from '@vercel/blob';

import { isVercelBlobMediaUrl } from '@/utils/media';

export async function deleteBlobMedia(urls: string[]) {
  const validUrls = [...new Set(urls)].filter(isVercelBlobMediaUrl);

  if (validUrls.length === 0 || !process.env.BLOB_READ_WRITE_TOKEN) {
    return;
  }

  try {
    await del(validUrls);
  } catch {
    // Database changes must not be rolled back because object cleanup failed.
  }
}

/**
 * Legacy compatibility export for archives applied over older project copies.
 * Media storage is implemented by Cloudinary; no Vercel Blob API is used.
 */
export { deleteCloudinaryMedia as deleteBlobMedia } from '@/lib/cloudinary-media';

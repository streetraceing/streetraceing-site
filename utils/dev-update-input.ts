import {
  getMediaAssetIdentity,
  MAX_DEV_UPDATE_IMAGES,
  parseMediaUrls,
} from '@/utils/media';
import { isDevUpdateTopic, type DevUpdateTopic } from '@/utils/stats';

export const MAX_DEV_UPDATE_CONTENT_LENGTH = 8_000;
export const MAX_DEV_UPDATE_TITLE_LENGTH = 160;
export const MAX_DEV_UPDATE_REQUEST_BYTES = 64 * 1_024;

export type DevUpdateInput = {
  title: string;
  content: string;
  topic: DevUpdateTopic;
  imageUrls: string[];
  uploadedImageUrls: string[];
};

export type DevUpdateInputResult =
  | { ok: true; input: DevUpdateInput }
  | {
      ok: false;
      reason: 'invalid' | 'title-too-long';
      uploadedImageUrls: string[];
    };

export function parseDevUpdateInput(
  body: Record<string, unknown>,
  cloudName: string | undefined,
): DevUpdateInputResult {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const topic = typeof body.topic === 'string' ? body.topic : '';
  const imageUrls = parseMediaUrls(
    body.imageUrls,
    MAX_DEV_UPDATE_IMAGES,
    cloudName,
  );
  const uploaded = parseMediaUrls(
    body.uploadedImageUrls === undefined ? [] : body.uploadedImageUrls,
    MAX_DEV_UPDATE_IMAGES,
    cloudName,
  );
  const imageIdentities = new Set(
    imageUrls?.map((url) => getMediaAssetIdentity(url, cloudName)),
  );
  const uploadedImageUrls = (uploaded ?? []).filter((url) =>
    imageIdentities.has(getMediaAssetIdentity(url, cloudName)),
  );

  if (!imageUrls || !uploaded) {
    return { ok: false, reason: 'invalid', uploadedImageUrls: [] };
  }

  if (
    !content ||
    content.length > MAX_DEV_UPDATE_CONTENT_LENGTH ||
    !isDevUpdateTopic(topic)
  ) {
    return { ok: false, reason: 'invalid', uploadedImageUrls };
  }

  if (title.length > MAX_DEV_UPDATE_TITLE_LENGTH) {
    return { ok: false, reason: 'title-too-long', uploadedImageUrls };
  }

  return {
    ok: true,
    input: { title, content, topic, imageUrls, uploadedImageUrls },
  };
}

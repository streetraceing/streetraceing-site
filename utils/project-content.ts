import { isJsonObject } from '@/utils/json';

export type ProjectContentData = {
  imageUrls: string[];
  updatedAt: string | null;
};

export function isProjectContentData(
  value: unknown,
): value is ProjectContentData {
  return (
    isJsonObject(value) &&
    Array.isArray(value.imageUrls) &&
    value.imageUrls.every((url: unknown) => typeof url === 'string') &&
    (value.updatedAt === null || typeof value.updatedAt === 'string')
  );
}

export function getDefaultProjectContent(): ProjectContentData {
  return {
    imageUrls: [],
    updatedAt: null,
  };
}

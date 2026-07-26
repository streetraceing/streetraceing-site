export type ProjectContentData = {
  imageUrls: string[];
  updatedAt: string | null;
};

export function getDefaultProjectContent(): ProjectContentData {
  return {
    imageUrls: [],
    updatedAt: null,
  };
}

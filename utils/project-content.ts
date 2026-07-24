import type { ProjectConfig } from '@/utils/config';

export type ProjectContentData = {
  documentation: {
    ru: string;
    en: string;
  };
  imageUrls: string[];
  updatedAt: string | null;
};

export function getDefaultProjectContent(
  project: ProjectConfig,
): ProjectContentData {
  return {
    documentation: {
      ru: project.documentation?.ru ?? '',
      en: project.documentation?.en ?? '',
    },
    imageUrls: [],
    updatedAt: null,
  };
}

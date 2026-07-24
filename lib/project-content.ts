import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { projectContents } from '@/db/schema';
import { mainPageConfig } from '@/utils/config';
import {
  getDefaultProjectContent,
  type ProjectContentData,
} from '@/utils/project-content';

export async function readProjectContent(
  slug: string,
): Promise<ProjectContentData | undefined> {
  const project = mainPageConfig.projects.find(
    (currentProject) => currentProject.slug === slug,
  );

  if (!project) {
    return undefined;
  }

  const fallback = getDefaultProjectContent(project);

  if (!process.env.DATABASE_URL) {
    return fallback;
  }

  try {
    const [storedContent] = await db
      .select()
      .from(projectContents)
      .where(eq(projectContents.projectSlug, slug))
      .limit(1);

    if (!storedContent) {
      return fallback;
    }

    return {
      documentation: {
        ru: storedContent.documentationRu,
        en: storedContent.documentationEn,
      },
      imageUrls: storedContent.imageUrls,
      updatedAt: storedContent.updatedAt.toISOString(),
    };
  } catch {
    return fallback;
  }
}

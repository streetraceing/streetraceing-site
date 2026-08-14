import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/db';
import { projectContents } from '@/db/schema';
import { isJsonObject, readJsonBody } from '@/lib/api-http';
import { noStoreJson } from '@/lib/api-response';
import { deleteCloudinaryMedia } from '@/lib/cloudinary-media';
import {
  confirmPendingMediaUploads,
  discardPendingMediaUploads,
} from '@/lib/pending-media-uploads';
import { isAdmin } from '@/utils/auth';
import { getRequestLocale, translations } from '@/utils/i18n';
import { MAX_PROJECT_IMAGES, normalizeMediaUrls } from '@/utils/media';
import { getProjectBySlug, getProjectHref } from '@/utils/project-catalog';

export const runtime = 'nodejs';

const MAX_PROJECT_CONTENT_REQUEST_BYTES = 32 * 1_024;

type RouteContext = {
  params: Promise<{ slug: string }>;
};

async function getProjectSlug(context: RouteContext) {
  const { slug } = await context.params;

  return getProjectBySlug(slug) ? slug : undefined;
}

export async function PUT(request: Request, context: RouteContext) {
  const apiStrings = translations[getRequestLocale(request)].api;
  const strings = apiStrings.projectContent;

  if (!(await isAdmin())) {
    return noStoreJson({ error: apiStrings.auth.required }, { status: 401 });
  }

  const slug = await getProjectSlug(context);

  if (!slug) {
    return noStoreJson({ error: strings.notFound }, { status: 404 });
  }

  const bodyResult = await readJsonBody(
    request,
    MAX_PROJECT_CONTENT_REQUEST_BYTES,
  );

  if (!bodyResult.ok || !isJsonObject(bodyResult.value)) {
    return noStoreJson(
      { error: strings.invalid },
      {
        status: bodyResult.ok || bodyResult.reason === 'invalid' ? 400 : 413,
      },
    );
  }

  const imageUrls = normalizeMediaUrls(
    bodyResult.value.imageUrls,
    MAX_PROJECT_IMAGES,
    process.env.CLOUDINARY_CLOUD_NAME,
  );
  const uploadedImageUrls = normalizeMediaUrls(
    bodyResult.value.uploadedImageUrls,
    MAX_PROJECT_IMAGES,
    process.env.CLOUDINARY_CLOUD_NAME,
  ).filter((url) => imageUrls.includes(url));

  if (!process.env.DATABASE_URL) {
    await discardPendingMediaUploads(uploadedImageUrls);
    return noStoreJson({ error: strings.databaseMissing }, { status: 503 });
  }

  try {
    const [previousContent] = await db
      .select({ imageUrls: projectContents.imageUrls })
      .from(projectContents)
      .where(eq(projectContents.projectSlug, slug))
      .limit(1);

    const [storedContent] = await db
      .insert(projectContents)
      .values({
        projectSlug: slug,
        imageUrls,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: projectContents.projectSlug,
        set: {
          imageUrls,
          updatedAt: new Date(),
        },
      })
      .returning({
        imageUrls: projectContents.imageUrls,
        updatedAt: projectContents.updatedAt,
      });

    if (!storedContent) {
      await discardPendingMediaUploads(uploadedImageUrls);
      return noStoreJson({ error: strings.saveFailed }, { status: 500 });
    }

    const removedUrls = (previousContent?.imageUrls ?? []).filter(
      (url) => !imageUrls.includes(url),
    );
    await deleteCloudinaryMedia(removedUrls);

    try {
      await confirmPendingMediaUploads(uploadedImageUrls);
    } catch (error) {
      console.error('Could not confirm uploaded project media.', error);
    }

    try {
      revalidatePath(getProjectHref({ slug }));
    } catch {
      // The route is force-dynamic; cache invalidation is only a best-effort extra.
    }

    return noStoreJson({
      content: {
        imageUrls: storedContent.imageUrls,
        updatedAt: storedContent.updatedAt.toISOString(),
      },
    });
  } catch {
    await discardPendingMediaUploads(uploadedImageUrls);
    return noStoreJson({ error: strings.saveFailed }, { status: 500 });
  }
}

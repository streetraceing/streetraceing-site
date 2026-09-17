import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/db';
import { projectContents } from '@/db/schema';
import {
  noStoreJson,
  readJsonObjectBody,
  requireAdminApi,
  requireDatabase,
} from '@/lib/api-response';
import {
  confirmPendingMediaUploads,
  discardPendingMediaUploads,
  registerRemovedMediaUploads,
} from '@/lib/pending-media-uploads';
import { getRequestLocale, translations } from '@/utils/i18n';
import {
  getMediaAssetIdentity,
  getRemovedMediaUrls,
  MAX_PROJECT_IMAGES,
  parseMediaUrls,
} from '@/utils/media';
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

  const adminGuard = await requireAdminApi(request);
  if (adminGuard) {
    return adminGuard;
  }

  const slug = await getProjectSlug(context);

  if (!slug) {
    return noStoreJson({ error: strings.notFound }, { status: 404 });
  }

  const bodyResult = await readJsonObjectBody(
    request,
    MAX_PROJECT_CONTENT_REQUEST_BYTES,
    { invalidError: strings.invalid },
  );

  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const imageUrls = parseMediaUrls(
    bodyResult.value.imageUrls,
    MAX_PROJECT_IMAGES,
    cloudName,
  );
  const uploaded = parseMediaUrls(
    bodyResult.value.uploadedImageUrls === undefined
      ? []
      : bodyResult.value.uploadedImageUrls,
    MAX_PROJECT_IMAGES,
    cloudName,
  );
  if (!imageUrls || !uploaded) {
    return noStoreJson({ error: strings.invalid }, { status: 400 });
  }
  const imageIdentities = new Set(
    imageUrls.map((url) => getMediaAssetIdentity(url, cloudName)),
  );
  const uploadedImageUrls = uploaded.filter((url) =>
    imageIdentities.has(getMediaAssetIdentity(url, cloudName)),
  );

  const databaseGuard = requireDatabase(strings.databaseMissing);
  if (databaseGuard) {
    await discardPendingMediaUploads(uploadedImageUrls);
    return databaseGuard;
  }

  try {
    const storedContent = await db.transaction(async (tx) => {
      // Materialize the row first so concurrent first saves serialize as well.
      await tx
        .insert(projectContents)
        .values({ projectSlug: slug })
        .onConflictDoNothing();
      const [previousContent] = await tx
        .select({ imageUrls: projectContents.imageUrls })
        .from(projectContents)
        .where(eq(projectContents.projectSlug, slug))
        .for('update');

      await registerRemovedMediaUploads(
        getRemovedMediaUrls(previousContent.imageUrls, imageUrls, cloudName),
        tx,
      );
      const [stored] = await tx
        .update(projectContents)
        .set({ imageUrls, updatedAt: new Date() })
        .where(eq(projectContents.projectSlug, slug))
        .returning({
          imageUrls: projectContents.imageUrls,
          updatedAt: projectContents.updatedAt,
        });
      return stored;
    });

    if (!storedContent) {
      await discardPendingMediaUploads(uploadedImageUrls);
      return noStoreJson({ error: strings.saveFailed }, { status: 500 });
    }

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

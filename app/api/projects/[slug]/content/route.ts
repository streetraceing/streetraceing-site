import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { projectContents } from '@/db/schema';
import { deleteCloudinaryMedia } from '@/lib/cloudinary-media';
import {
  confirmPendingMediaUploads,
  discardPendingMediaUploads,
} from '@/lib/pending-media-uploads';
import { isAdmin } from '@/utils/auth';
import { mainPageConfig } from '@/utils/config';
import { getRequestLocale, translations } from '@/utils/i18n';
import { MAX_PROJECT_IMAGES, normalizeMediaUrls } from '@/utils/media';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

async function getProjectSlug(context: RouteContext) {
  const { slug } = await context.params;

  return mainPageConfig.projects.some((project) => project.slug === slug)
    ? slug
    : undefined;
}

export async function PUT(request: Request, context: RouteContext) {
  const apiStrings = translations[getRequestLocale(request)].api;
  const strings = apiStrings.projectContent;

  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: apiStrings.auth.required },
      { status: 401 },
    );
  }

  const slug = await getProjectSlug(context);

  if (!slug) {
    return NextResponse.json({ error: strings.notFound }, { status: 404 });
  }

  let body: {
    imageUrls?: unknown;
    uploadedImageUrls?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: strings.invalid }, { status: 400 });
  }

  const imageUrls = normalizeMediaUrls(
    body.imageUrls,
    MAX_PROJECT_IMAGES,
    process.env.CLOUDINARY_CLOUD_NAME,
  );
  const uploadedImageUrls = normalizeMediaUrls(
    body.uploadedImageUrls,
    MAX_PROJECT_IMAGES,
    process.env.CLOUDINARY_CLOUD_NAME,
  ).filter((url) => imageUrls.includes(url));

  if (!process.env.DATABASE_URL) {
    await discardPendingMediaUploads(uploadedImageUrls);
    return NextResponse.json(
      { error: strings.databaseMissing },
      { status: 503 },
    );
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
      return NextResponse.json({ error: strings.saveFailed }, { status: 500 });
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
      revalidatePath(`/project/${slug}`);
    } catch {
      // The route is force-dynamic; cache invalidation is only a best-effort extra.
    }

    return NextResponse.json({
      content: {
        imageUrls: storedContent.imageUrls,
        updatedAt: storedContent.updatedAt.toISOString(),
      },
    });
  } catch {
    await discardPendingMediaUploads(uploadedImageUrls);
    return NextResponse.json({ error: strings.saveFailed }, { status: 500 });
  }
}

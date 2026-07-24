import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { projectContents } from '@/db/schema';
import { deleteBlobMedia } from '@/lib/blob-media';
import { readProjectContent } from '@/lib/project-content';
import { isAdmin } from '@/utils/auth';
import { mainPageConfig } from '@/utils/config';
import { getRequestLocale, translations } from '@/utils/i18n';
import { MAX_PROJECT_IMAGES, normalizeMediaUrls } from '@/utils/media';

export const runtime = 'nodejs';

const MAX_DOCUMENTATION_LENGTH = 50_000;

type RouteContext = {
  params: Promise<{ slug: string }>;
};

async function getProjectSlug(context: RouteContext) {
  const { slug } = await context.params;

  return mainPageConfig.projects.some((project) => project.slug === slug)
    ? slug
    : undefined;
}

export async function GET(request: Request, context: RouteContext) {
  const strings = translations[getRequestLocale(request)].api.projectContent;
  const slug = await getProjectSlug(context);

  if (!slug) {
    return NextResponse.json({ error: strings.notFound }, { status: 404 });
  }

  const content = await readProjectContent(slug);
  const response = NextResponse.json({ content });

  response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=60');
  return response;
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
    documentation?: { ru?: unknown; en?: unknown };
    imageUrls?: unknown;
    uploadedImageUrls?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: strings.invalid }, { status: 400 });
  }

  const documentationRu =
    typeof body.documentation?.ru === 'string'
      ? body.documentation.ru.trim()
      : '';
  const documentationEn =
    typeof body.documentation?.en === 'string'
      ? body.documentation.en.trim()
      : '';
  const imageUrls = normalizeMediaUrls(body.imageUrls, MAX_PROJECT_IMAGES);
  const uploadedImageUrls = normalizeMediaUrls(
    body.uploadedImageUrls,
    MAX_PROJECT_IMAGES,
  ).filter((url) => imageUrls.includes(url));

  if (
    documentationRu.length > MAX_DOCUMENTATION_LENGTH ||
    documentationEn.length > MAX_DOCUMENTATION_LENGTH
  ) {
    await deleteBlobMedia(uploadedImageUrls);
    return NextResponse.json({ error: strings.tooLong }, { status: 400 });
  }

  if (!process.env.DATABASE_URL) {
    await deleteBlobMedia(uploadedImageUrls);
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
        documentationRu,
        documentationEn,
        imageUrls,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: projectContents.projectSlug,
        set: {
          documentationRu,
          documentationEn,
          imageUrls,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!storedContent) {
      await deleteBlobMedia(uploadedImageUrls);
      return NextResponse.json({ error: strings.saveFailed }, { status: 500 });
    }

    const removedUrls = (previousContent?.imageUrls ?? []).filter(
      (url) => !imageUrls.includes(url),
    );
    await deleteBlobMedia(removedUrls);

    try {
      revalidatePath(`/project/${slug}`);
    } catch {
      // The route is force-dynamic; cache invalidation is only a best-effort extra.
    }

    return NextResponse.json({
      content: {
        documentation: {
          ru: storedContent.documentationRu,
          en: storedContent.documentationEn,
        },
        imageUrls: storedContent.imageUrls,
        updatedAt: storedContent.updatedAt.toISOString(),
      },
    });
  } catch {
    await deleteBlobMedia(uploadedImageUrls);
    return NextResponse.json({ error: strings.saveFailed }, { status: 500 });
  }
}

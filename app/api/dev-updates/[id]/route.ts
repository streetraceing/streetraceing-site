import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { devUpdates } from '@/db/schema';
import { isJsonObject, readJsonBody } from '@/lib/api-http';
import { noStoreJson } from '@/lib/api-response';
import { deleteCloudinaryMedia } from '@/lib/cloudinary-media';
import {
  confirmPendingMediaUploads,
  discardPendingMediaUploads,
} from '@/lib/pending-media-uploads';
import { isAdmin } from '@/utils/auth';
import {
  MAX_DEV_UPDATE_REQUEST_BYTES,
  parseDevUpdateInput,
} from '@/utils/dev-update-input';
import { getRequestLocale, translations } from '@/utils/i18n';

export const runtime = 'nodejs';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getUpdateId(context: RouteContext) {
  const { id } = await context.params;

  return UUID_PATTERN.test(id) ? id : undefined;
}

export async function PATCH(request: Request, context: RouteContext) {
  const locale = getRequestLocale(request);
  const apiStrings = translations[locale].api;
  const strings = apiStrings.devNotes;

  if (!(await isAdmin())) {
    return noStoreJson({ error: apiStrings.auth.required }, { status: 401 });
  }

  const id = await getUpdateId(context);

  if (!id) {
    return noStoreJson({ error: strings.notFound }, { status: 404 });
  }

  const bodyResult = await readJsonBody(request, MAX_DEV_UPDATE_REQUEST_BYTES);

  if (!bodyResult.ok || !isJsonObject(bodyResult.value)) {
    return noStoreJson(
      { error: apiStrings.auth.invalidRequest },
      {
        status: bodyResult.ok || bodyResult.reason === 'invalid' ? 400 : 413,
      },
    );
  }

  const parsedInput = parseDevUpdateInput(
    bodyResult.value,
    process.env.CLOUDINARY_CLOUD_NAME,
  );

  if (!parsedInput.ok) {
    await discardPendingMediaUploads(parsedInput.uploadedImageUrls);
    return noStoreJson(
      {
        error:
          parsedInput.reason === 'title-too-long'
            ? strings.titleTooLong
            : strings.invalid,
      },
      { status: 400 },
    );
  }

  const { title, content, topic, imageUrls, uploadedImageUrls } =
    parsedInput.input;

  if (!process.env.DATABASE_URL) {
    await discardPendingMediaUploads(uploadedImageUrls);
    return noStoreJson({ error: strings.databaseMissing }, { status: 503 });
  }

  try {
    const [previousUpdate] = await db
      .select({ imageUrls: devUpdates.imageUrls })
      .from(devUpdates)
      .where(eq(devUpdates.id, id))
      .limit(1);

    const [update] = await db
      .update(devUpdates)
      .set({ title: title || null, content, topic, imageUrls })
      .where(eq(devUpdates.id, id))
      .returning();

    if (!update) {
      await discardPendingMediaUploads(uploadedImageUrls);
      return noStoreJson({ error: strings.notFound }, { status: 404 });
    }

    const removedUrls = (previousUpdate?.imageUrls ?? []).filter(
      (url) => !imageUrls.includes(url),
    );
    await deleteCloudinaryMedia(removedUrls);

    try {
      await confirmPendingMediaUploads(uploadedImageUrls);
    } catch (error) {
      console.error('Could not confirm updated Dev Note media.', error);
    }

    return noStoreJson({ update });
  } catch {
    await discardPendingMediaUploads(uploadedImageUrls);
    return noStoreJson({ error: strings.saveFailed }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const locale = getRequestLocale(request);
  const apiStrings = translations[locale].api;
  const strings = apiStrings.devNotes;

  if (!(await isAdmin())) {
    return noStoreJson({ error: apiStrings.auth.required }, { status: 401 });
  }

  const id = await getUpdateId(context);

  if (!id) {
    return noStoreJson({ error: strings.notFound }, { status: 404 });
  }

  if (!process.env.DATABASE_URL) {
    return noStoreJson({ error: strings.databaseMissing }, { status: 503 });
  }

  try {
    const [deletedUpdate] = await db
      .delete(devUpdates)
      .where(eq(devUpdates.id, id))
      .returning({ id: devUpdates.id, imageUrls: devUpdates.imageUrls });

    if (!deletedUpdate) {
      return noStoreJson({ error: strings.notFound }, { status: 404 });
    }

    await deleteCloudinaryMedia(deletedUpdate.imageUrls);

    return noStoreJson({ id: deletedUpdate.id });
  } catch {
    return noStoreJson({ error: strings.deleteFailed }, { status: 500 });
  }
}

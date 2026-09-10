import { db } from '@/db';
import { devUpdates } from '@/db/schema';
import {
  noStoreJson,
  readJsonObjectBody,
  requireAdminApi,
  requireDatabase,
} from '@/lib/api-response';
import {
  confirmPendingMediaUploads,
  discardPendingMediaUploads,
} from '@/lib/pending-media-uploads';
import { readDevUpdatesFeed } from '@/lib/dev-updates';
import {
  MAX_DEV_UPDATE_REQUEST_BYTES,
  parseDevUpdateInput,
} from '@/utils/dev-update-input';
import { getRequestLocale, translations } from '@/utils/i18n';
import { parsePositiveInteger } from '@/utils/numbers';
import { isDevUpdateSort, isDevUpdateTopic } from '@/utils/stats';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const locale = getRequestLocale(request);
  const strings = translations[locale].api.devNotes;

  const databaseGuard = requireDatabase(strings.databaseMissing);
  if (databaseGuard) {
    return databaseGuard;
  }

  const { searchParams } = new URL(request.url);
  const page = parsePositiveInteger(searchParams.get('page'), 1, 10_000);
  const topicValue = searchParams.get('topic');
  const topic =
    topicValue && isDevUpdateTopic(topicValue) ? topicValue : undefined;
  const sortValue = searchParams.get('sort');
  const sort = sortValue && isDevUpdateSort(sortValue) ? sortValue : 'newest';

  try {
    return noStoreJson(await readDevUpdatesFeed({ page, topic, sort }));
  } catch {
    return noStoreJson({ error: strings.loadFailed }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const locale = getRequestLocale(request);
  const apiStrings = translations[locale].api;
  const strings = apiStrings.devNotes;

  const adminGuard = await requireAdminApi(request);
  if (adminGuard) {
    return adminGuard;
  }

  const bodyResult = await readJsonObjectBody(
    request,
    MAX_DEV_UPDATE_REQUEST_BYTES,
    { invalidError: apiStrings.auth.invalidRequest },
  );

  if (!bodyResult.ok) {
    return bodyResult.response;
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

  const databaseGuard = requireDatabase(strings.databaseMissing);
  if (databaseGuard) {
    await discardPendingMediaUploads(uploadedImageUrls);
    return databaseGuard;
  }

  try {
    const [update] = await db
      .insert(devUpdates)
      .values({
        title: title || null,
        content,
        topic,
        imageUrls,
      })
      .returning();

    if (!update) {
      await discardPendingMediaUploads(uploadedImageUrls);
      return noStoreJson({ error: strings.saveFailed }, { status: 500 });
    }

    try {
      await confirmPendingMediaUploads(uploadedImageUrls);
    } catch (error) {
      console.error('Could not confirm uploaded Dev Note media.', error);
    }

    return noStoreJson({ update }, { status: 201 });
  } catch {
    await discardPendingMediaUploads(uploadedImageUrls);
    return noStoreJson({ error: strings.saveFailed }, { status: 500 });
  }
}

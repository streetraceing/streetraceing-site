import { db } from '@/db';
import { devUpdates } from '@/db/schema';
import { isJsonObject, readJsonBody } from '@/lib/api-http';
import { noStoreJson } from '@/lib/api-response';
import {
  confirmPendingMediaUploads,
  discardPendingMediaUploads,
} from '@/lib/pending-media-uploads';
import { readDevUpdatesFeed } from '@/lib/dev-updates';
import { isAdmin } from '@/utils/auth';
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

  if (!process.env.DATABASE_URL) {
    return noStoreJson({ error: strings.databaseMissing }, { status: 503 });
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

  if (!(await isAdmin())) {
    return noStoreJson({ error: apiStrings.auth.required }, { status: 401 });
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

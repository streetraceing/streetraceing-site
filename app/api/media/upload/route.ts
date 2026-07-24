import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

import { isAdmin } from '@/utils/auth';
import { mainPageConfig } from '@/utils/config';
import { getRequestLocale, translations } from '@/utils/i18n';
import {
  getMediaPathPrefix,
  isMediaUploadScope,
  MAX_MEDIA_UPLOAD_BYTES,
} from '@/utils/media';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const apiStrings = translations[getRequestLocale(request)].api;
  const strings = apiStrings.media;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: strings.notConfigured }, { status: 503 });
  }

  let body: HandleUploadBody;

  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: strings.invalid }, { status: 400 });
  }

  try {
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!(await isAdmin())) {
          throw new Error(apiStrings.auth.required);
        }

        let scope: unknown;

        try {
          scope = JSON.parse(clientPayload ?? 'null');
        } catch {
          throw new Error(strings.invalid);
        }

        if (!isMediaUploadScope(scope)) {
          throw new Error(strings.invalid);
        }

        if (
          scope.type === 'project' &&
          !mainPageConfig.projects.some(
            (project) => project.slug === scope.projectSlug,
          )
        ) {
          throw new Error(strings.invalid);
        }

        if (
          !pathname.startsWith(getMediaPathPrefix(scope)) ||
          !pathname.endsWith('.webp')
        ) {
          throw new Error(strings.invalid);
        }

        return {
          allowedContentTypes: ['image/webp'],
          maximumSizeInBytes: MAX_MEDIA_UPLOAD_BYTES,
          tokenPayload: JSON.stringify(scope),
        };
      },
      onUploadCompleted: async () => {
        // The owning API stores the URL only after its database write succeeds.
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    const isAuthorizationError =
      error instanceof Error && error.message === apiStrings.auth.required;
    const errorMessage =
      error instanceof Error &&
      (error.message === strings.invalid || isAuthorizationError)
        ? error.message
        : strings.uploadFailed;

    return NextResponse.json(
      { error: errorMessage },
      { status: isAuthorizationError ? 401 : 400 },
    );
  }
}

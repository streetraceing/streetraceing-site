import { NextResponse } from 'next/server';

import { isJsonObject, readJsonBody } from '@/lib/api-http';
import { isAdmin } from '@/utils/auth';
import { getRequestLocale, translations } from '@/utils/i18n';

export function noStoreJson(
  body: unknown,
  init?: ResponseInit,
  additionalHeaders?: HeadersInit,
) {
  const response = NextResponse.json(body, init);

  if (additionalHeaders) {
    const headers = new Headers(additionalHeaders);
    headers.forEach((value, name) => response.headers.set(name, value));
  }

  response.headers.set('Cache-Control', 'no-store');
  return response;
}

/** Returns the shared localized 401 response while the caller is not an admin. */
export async function requireAdminApi(
  request: Request,
): Promise<Response | null> {
  if (await isAdmin()) {
    return null;
  }

  const { required } = translations[getRequestLocale(request)].api.auth;
  return noStoreJson({ error: required }, { status: 401 });
}

/** Returns the shared 503 response while the database is not configured. */
export function requireDatabase(
  missingError: string,
  headers?: HeadersInit,
): Response | null {
  if (process.env.DATABASE_URL) {
    return null;
  }

  return noStoreJson({ error: missingError }, { status: 503, headers });
}

export type JsonObjectBodyResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; response: Response };

type JsonObjectBodyErrors = {
  /** Message for unparsable or non-object JSON bodies (HTTP 400). */
  invalidError: string;
  /** Message for bodies above maximumBytes (HTTP 413); defaults to invalidError. */
  tooLargeError?: string;
  /** Extra error-response headers, such as rate-limit information. */
  headers?: HeadersInit;
};

/** Reads a bounded JSON body that must be an object and maps failures to the
 * shared no-store error responses. */
export async function readJsonObjectBody(
  request: Request,
  maximumBytes: number,
  errors: JsonObjectBodyErrors,
): Promise<JsonObjectBodyResult> {
  const bodyResult = await readJsonBody(request, maximumBytes);

  if (bodyResult.ok) {
    return isJsonObject(bodyResult.value)
      ? { ok: true, value: bodyResult.value }
      : {
          ok: false,
          response: buildBodyError(400, errors.invalidError, errors.headers),
        };
  }

  if (bodyResult.reason === 'too-large') {
    return {
      ok: false,
      response: buildBodyError(
        413,
        errors.tooLargeError ?? errors.invalidError,
        errors.headers,
      ),
    };
  }

  return {
    ok: false,
    response: buildBodyError(400, errors.invalidError, errors.headers),
  };
}

function buildBodyError(
  status: 400 | 413,
  error: string,
  headers?: HeadersInit,
) {
  return noStoreJson({ error }, { status, headers });
}

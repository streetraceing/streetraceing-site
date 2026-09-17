import { createHash, createHmac } from 'node:crypto';

type R2Config = {
  accessKeyId: string;
  secretAccessKey: string;
  baseEndpoint: string;
  host: string;
};

const EMPTY_PAYLOAD_HASH = createHash('sha256').update('').digest('hex');
const R2_REQUEST_TIMEOUT_MS = 10_000;
const MAX_PRESIGNED_TTL_SECONDS = 7 * 24 * 60 * 60;

export function getR2Origin(): string | undefined {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  if (
    !accountId ||
    !/^[a-f0-9]{32}$/i.test(accountId) ||
    !bucket ||
    !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)
  ) {
    return undefined;
  }

  return `https://${accountId.toLowerCase()}.r2.cloudflarestorage.com`;
}

export function getR2Config(): R2Config | undefined {
  const origin = getR2Origin();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();

  if (
    !origin ||
    !accessKeyId ||
    accessKeyId.length > 256 ||
    !/^[A-Za-z0-9]+$/.test(accessKeyId) ||
    !secretAccessKey ||
    secretAccessKey.length > 4_096 ||
    /\p{Cc}/u.test(secretAccessKey)
  ) {
    return undefined;
  }

  return {
    accessKeyId,
    secretAccessKey,
    baseEndpoint: `${origin}/${bucket}`,
    host: new URL(origin).host,
  };
}

function hmac(key: Buffer | string, value: string) {
  return createHmac('sha256', key).update(value).digest();
}

function sha256Hex(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function buildSigningKey(secret: string, date: string) {
  const dateKey = hmac(`AWS4${secret}`, date);
  const regionKey = hmac(dateKey, 'auto');
  const serviceKey = hmac(regionKey, 's3');

  return hmac(serviceKey, 'aws4_request');
}

function awsEncode(value: string) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function createSignature(
  config: R2Config,
  datetime: string,
  canonicalRequest: string,
) {
  const date = datetime.slice(0, 8);
  const scope = `${date}/auto/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    datetime,
    scope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  return createHmac('sha256', buildSigningKey(config.secretAccessKey, date))
    .update(stringToSign)
    .digest('hex');
}

function buildObjectUrl(config: R2Config, key: string) {
  if (
    typeof key !== 'string' ||
    Buffer.byteLength(key, 'utf8') > 1_024 ||
    /[\\\p{Cc}]/u.test(key) ||
    key
      .split('/')
      .some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    throw new Error('Invalid R2 object key.');
  }

  return new URL(
    `${config.baseEndpoint}/${key.split('/').map(awsEncode).join('/')}`,
  );
}

function createAmzDatetime(now: Date) {
  return now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function validateTtl(expiresIn: number) {
  if (
    !Number.isSafeInteger(expiresIn) ||
    expiresIn < 1 ||
    expiresIn > MAX_PRESIGNED_TTL_SECONDS
  ) {
    throw new Error('Invalid R2 presigned URL lifetime.');
  }
}

/** The optional clock keeps signing deterministic without changing callers. */
export function createR2PresignedPutUrl(
  key: string,
  options: { expiresIn: number; contentDisposition: string },
  now = new Date(),
): string {
  const config = getR2Config();
  if (!config) {
    throw new Error('R2 storage is not configured.');
  }

  validateTtl(options.expiresIn);
  if (
    typeof options.contentDisposition !== 'string' ||
    !options.contentDisposition ||
    options.contentDisposition.length > 1_024 ||
    /[^\x20-\x7e]/.test(options.contentDisposition)
  ) {
    throw new Error('Invalid R2 content disposition.');
  }

  const objectUrl = buildObjectUrl(config, key);
  const datetime = createAmzDatetime(now);
  const canonicalQuery = [
    'X-Amz-Algorithm=AWS4-HMAC-SHA256',
    `X-Amz-Credential=${awsEncode(`${config.accessKeyId}/${datetime.slice(0, 8)}/auto/s3/aws4_request`)}`,
    `X-Amz-Date=${datetime}`,
    `X-Amz-Expires=${options.expiresIn}`,
    'X-Amz-SignedHeaders=content-disposition%3Bhost',
  ].join('&');
  const disposition = options.contentDisposition.trim().replace(/ +/g, ' ');
  const canonicalRequest = [
    'PUT',
    objectUrl.pathname,
    canonicalQuery,
    `content-disposition:${disposition}\nhost:${objectUrl.host}\n`,
    'content-disposition;host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const signature = createSignature(config, datetime, canonicalRequest);

  return `${objectUrl.href}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

export function createR2PresignedGetUrl(
  key: string,
  expiresIn: number,
  now = new Date(),
): string {
  const config = getR2Config();
  if (!config) {
    throw new Error('R2 storage is not configured.');
  }

  validateTtl(expiresIn);
  const objectUrl = buildObjectUrl(config, key);
  const datetime = createAmzDatetime(now);
  const canonicalQuery = [
    'X-Amz-Algorithm=AWS4-HMAC-SHA256',
    `X-Amz-Credential=${awsEncode(`${config.accessKeyId}/${datetime.slice(0, 8)}/auto/s3/aws4_request`)}`,
    `X-Amz-Date=${datetime}`,
    `X-Amz-Expires=${expiresIn}`,
    'X-Amz-SignedHeaders=host',
  ].join('&');
  const canonicalRequest = [
    'GET',
    objectUrl.pathname,
    canonicalQuery,
    `host:${objectUrl.host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const signature = createSignature(config, datetime, canonicalRequest);

  return `${objectUrl.href}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

async function fetchR2Object(
  config: R2Config,
  key: string,
  method: 'HEAD' | 'DELETE',
  now: Date,
) {
  const objectUrl = buildObjectUrl(config, key);
  const datetime = createAmzDatetime(now);
  const scope = `${datetime.slice(0, 8)}/auto/s3/aws4_request`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [
    method,
    objectUrl.pathname,
    '',
    `host:${objectUrl.host}\nx-amz-content-sha256:${EMPTY_PAYLOAD_HASH}\nx-amz-date:${datetime}\n`,
    signedHeaders,
    EMPTY_PAYLOAD_HASH,
  ].join('\n');
  const signature = createSignature(config, datetime, canonicalRequest);

  return fetch(objectUrl.href, {
    method,
    headers: {
      Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      'x-amz-content-sha256': EMPTY_PAYLOAD_HASH,
      'x-amz-date': datetime,
    },
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(R2_REQUEST_TIMEOUT_MS),
  });
}

export type R2ObjectMetadata = {
  size: number;
  contentType: string | null;
  contentDisposition: string | null;
  etag: string | null;
};

/** Returns undefined only for 404; configuration, transport and metadata errors throw. */
export async function getR2ObjectMetadata(
  key: string,
  now = new Date(),
): Promise<R2ObjectMetadata | undefined> {
  const config = getR2Config();
  if (!config) {
    throw new Error('R2 storage is not configured.');
  }

  const response = await fetchR2Object(config, key, 'HEAD', now);
  if (response.status === 404) {
    return undefined;
  }
  if (!response.ok) {
    throw new Error(`Could not read R2 metadata: HTTP ${response.status}.`);
  }

  const length = response.headers.get('content-length');
  if (
    !length ||
    !/^\d+$/.test(length) ||
    !Number.isSafeInteger(Number(length))
  ) {
    throw new Error('Invalid R2 object size.');
  }

  return {
    size: Number(length),
    contentType: response.headers.get('content-type'),
    contentDisposition: response.headers.get('content-disposition'),
    etag: response.headers.get('etag'),
  };
}

export type R2DeleteResult = {
  requested: number;
  deleted: number;
  failed: number;
};

export async function deleteR2Objects(
  keys: string[],
  now?: Date,
): Promise<R2DeleteResult> {
  const uniqueKeys = [...new Set(keys)];
  const config = getR2Config();
  if (!config) {
    if (uniqueKeys.length > 0) {
      console.error(
        'R2 deletion is unavailable because its configuration is invalid.',
      );
    }
    return {
      requested: uniqueKeys.length,
      deleted: 0,
      failed: uniqueKeys.length,
    };
  }

  const activeConfig = config;
  let deleted = 0;
  let failed = 0;
  let nextIndex = 0;

  async function deleteNextObject() {
    while (nextIndex < uniqueKeys.length) {
      const key = uniqueKeys[nextIndex];
      nextIndex += 1;
      try {
        const response = await fetchR2Object(
          activeConfig,
          key,
          'DELETE',
          now ?? new Date(),
        );
        await response.body?.cancel();
        if (response.ok || response.status === 404) {
          deleted += 1;
        } else {
          console.error(`Could not delete R2 object: HTTP ${response.status}.`);
          failed += 1;
        }
      } catch {
        console.error('Could not delete R2 object.');
        failed += 1;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(5, uniqueKeys.length) }, () =>
      deleteNextObject(),
    ),
  );
  return { requested: uniqueKeys.length, deleted, failed };
}

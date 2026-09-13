import { createHash, createHmac } from 'node:crypto';

type R2Config = {
  accessKeyId: string;
  secretAccessKey: string;
  baseEndpoint: string;
  host: string;
};

const EMPTY_PAYLOAD_HASH = createHash('sha256').update('').digest('hex');

export function getR2Config(): R2Config | undefined {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return undefined;
  }

  return {
    accessKeyId,
    secretAccessKey,
    baseEndpoint: `https://${accountId}.r2.cloudflarestorage.com/${bucket}`,
    host: `${accountId}.r2.cloudflarestorage.com`,
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

function encodeKeyPath(key: string) {
  return key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
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
  const encodedKey = key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `${config.baseEndpoint}/${encodedKey}`;
}

function createAmzDatetime(now = new Date()) {
  return now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/** Creates a short-lived presigned PUT URL so the browser can upload a chat
 * attachment straight into the private bucket without proxying the bytes
 * through a serverless function. */
export function createR2PresignedPutUrl(
  key: string,
  options: { expiresIn: number; contentDisposition: string },
): string {
  const config = getR2Config();

  if (!config) {
    throw new Error('R2 storage is not configured.');
  }

  const datetime = createAmzDatetime();
  const canonicalQuery = [
    'X-Amz-Algorithm=AWS4-HMAC-SHA256',
    `X-Amz-Credential=${encodeURIComponent(`${config.accessKeyId}/${datetime.slice(0, 8)}/auto/s3/aws4_request`)}`,
    `X-Amz-Date=${datetime}`,
    `X-Amz-Expires=${options.expiresIn}`,
    'X-Amz-SignedHeaders=content-disposition%3Bhost',
  ].join('&');
  const canonicalRequest = [
    'PUT',
    `/${encodeKeyPath(key)}`,
    canonicalQuery,
    `content-disposition:${options.contentDisposition}\nhost:${config.host}\n`,
    'content-disposition;host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const signature = createSignature(config, datetime, canonicalRequest);

  return `${buildObjectUrl(config, key)}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/** Creates a short-lived presigned GET URL for a chat attachment download. */
export function createR2PresignedGetUrl(
  key: string,
  expiresIn: number,
): string {
  const config = getR2Config();

  if (!config) {
    throw new Error('R2 storage is not configured.');
  }

  const datetime = createAmzDatetime();
  const canonicalQuery = [
    'X-Amz-Algorithm=AWS4-HMAC-SHA256',
    `X-Amz-Credential=${encodeURIComponent(`${config.accessKeyId}/${datetime.slice(0, 8)}/auto/s3/aws4_request`)}`,
    `X-Amz-Date=${datetime}`,
    `X-Amz-Expires=${expiresIn}`,
    'X-Amz-SignedHeaders=host',
  ].join('&');
  const canonicalRequest = [
    'GET',
    `/${encodeKeyPath(key)}`,
    canonicalQuery,
    `host:${config.host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const signature = createSignature(config, datetime, canonicalRequest);

  return `${buildObjectUrl(config, key)}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

export type R2DeleteResult = {
  requested: number;
  deleted: number;
  failed: number;
};

export async function deleteR2Objects(keys: string[]): Promise<R2DeleteResult> {
  const uniqueKeys = [...new Set(keys.filter(Boolean))];
  const config = getR2Config();

  if (!config) {
    if (uniqueKeys.length > 0) {
      console.error(
        'R2 deletion is unavailable because its credentials are incomplete.',
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

      if (!key) {
        continue;
      }

      try {
        const datetime = createAmzDatetime();
        const scope = `${datetime.slice(0, 8)}/auto/s3/aws4_request`;
        const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
        const canonicalRequest = [
          'DELETE',
          `/${encodeKeyPath(key)}`,
          '',
          `host:${activeConfig.host}\nx-amz-content-sha256:${EMPTY_PAYLOAD_HASH}\nx-amz-date:${datetime}\n`,
          signedHeaders,
          EMPTY_PAYLOAD_HASH,
        ].join('\n');
        const signature = createSignature(
          activeConfig,
          datetime,
          canonicalRequest,
        );

        const response = await fetch(buildObjectUrl(activeConfig, key), {
          method: 'DELETE',
          headers: {
            Authorization: `AWS4-HMAC-SHA256 Credential=${activeConfig.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
            'x-amz-content-sha256': EMPTY_PAYLOAD_HASH,
            'x-amz-date': datetime,
          },
          cache: 'no-store',
        });

        if (response.ok || response.status === 404) {
          deleted += 1;
        } else {
          console.error(
            `Could not delete R2 object "${key}": HTTP ${response.status}.`,
          );
          failed += 1;
        }
      } catch (error) {
        console.error(`Could not delete R2 object "${key}".`, error);
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

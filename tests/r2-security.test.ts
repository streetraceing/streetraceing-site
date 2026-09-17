import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import test, { type TestContext } from 'node:test';

import {
  createR2PresignedGetUrl,
  createR2PresignedPutUrl,
  deleteR2Objects,
  getR2Config,
  getR2ObjectMetadata,
  getR2Origin,
} from '../lib/r2';

const NOW = new Date('2026-09-14T12:34:56.000Z');
const DATETIME = '20260914T123456Z';
const ACCOUNT = '0123456789abcdef0123456789abcdef';
const HOST = `${ACCOUNT}.r2.cloudflarestorage.com`;
const SCOPE = '20260914/auto/s3/aws4_request';
const KEY = "temp-chat/example/a b!'()*+%.txt";
const PATH = '/test-bucket/temp-chat/example/a%20b%21%27%28%29%2A%2B%25.txt';
const EMPTY_HASH = createHash('sha256').update('').digest('hex');

function setup(t: TestContext) {
  const environment = {
    R2_ACCOUNT_ID: ACCOUNT,
    R2_BUCKET: 'test-bucket',
    R2_ACCESS_KEY_ID: 'testAccessKey',
    R2_SECRET_ACCESS_KEY: 'test-only-signing-secret',
  };
  for (const [name, value] of Object.entries(environment)) {
    const previous = process.env[name];
    process.env[name] = ` ${value} `;
    t.after(() => {
      if (previous === undefined) Reflect.deleteProperty(process.env, name);
      else process.env[name] = previous;
    });
  }
}

function referenceSignature(canonical: string) {
  let key: Buffer = Buffer.from('AWS4test-only-signing-secret');
  for (const component of ['20260914', 'auto', 's3', 'aws4_request']) {
    key = createHmac('sha256', key).update(component).digest();
  }
  const digest = createHash('sha256').update(canonical).digest('hex');
  return createHmac('sha256', key)
    .update(`AWS4-HMAC-SHA256\n${DATETIME}\n${SCOPE}\n${digest}`)
    .digest('hex');
}

test('fixed-clock GET and PUT signatures cover the exact AWS-encoded bucket path', (t) => {
  setup(t);
  for (const method of ['GET', 'PUT'] as const) {
    const signedHeaders =
      method === 'GET' ? 'host' : 'content-disposition;host';
    const query = [
      'X-Amz-Algorithm=AWS4-HMAC-SHA256',
      'X-Amz-Credential=testAccessKey%2F20260914%2Fauto%2Fs3%2Faws4_request',
      `X-Amz-Date=${DATETIME}`,
      'X-Amz-Expires=300',
      `X-Amz-SignedHeaders=${encodeURIComponent(signedHeaders)}`,
    ].join('&');
    const headers =
      method === 'GET'
        ? `host:${HOST}\n`
        : `content-disposition:attachment; filename="a b.txt"\nhost:${HOST}\n`;
    const canonical = [
      method,
      PATH,
      query,
      headers,
      signedHeaders,
      'UNSIGNED-PAYLOAD',
    ].join('\n');
    const expected = `https://${HOST}${PATH}?${query}&X-Amz-Signature=${referenceSignature(canonical)}`;
    const actual =
      method === 'GET'
        ? createR2PresignedGetUrl(KEY, 300, NOW)
        : createR2PresignedPutUrl(
            KEY,
            {
              expiresIn: 300,
              contentDisposition: ' attachment;  filename="a b.txt" ',
            },
            NOW,
          );
    assert.equal(actual, expected);
    assert.notEqual(
      referenceSignature(canonical),
      referenceSignature(canonical.replace('/test-bucket/', '/')),
    );
  }
  assert.match(
    createR2PresignedGetUrl('files/%2e%2e/file', 1, NOW),
    /files\/%252e%252e\/file/,
  );
});

test('R2 rejects unsafe configuration, paths, headers and invalid TTLs', (t) => {
  setup(t);
  for (const key of [
    '',
    '/file',
    'file/',
    'a//b',
    '../b',
    'a/./b',
    'a/../b',
    'a\\b',
    'a\u0000b',
    'a'.repeat(1_025),
  ]) {
    assert.throws(() => createR2PresignedGetUrl(key, 300, NOW));
    assert.throws(() =>
      createR2PresignedPutUrl(
        key,
        { expiresIn: 300, contentDisposition: 'attachment' },
        NOW,
      ),
    );
  }
  for (const ttl of [0, -1, 1.5, NaN, Infinity, 604_801]) {
    assert.throws(() => createR2PresignedGetUrl('file', ttl, NOW));
    assert.throws(() =>
      createR2PresignedPutUrl(
        'file',
        { expiresIn: ttl, contentDisposition: 'attachment' },
        NOW,
      ),
    );
  }
  assert.throws(() =>
    createR2PresignedPutUrl(
      'file',
      { expiresIn: 300, contentDisposition: 'attachment\r\nx-test: injected' },
      NOW,
    ),
  );
  assert.throws(() => createR2PresignedGetUrl('file', 300, new Date(NaN)));
  for (const account of [
    'evil.example/path',
    `${ACCOUNT}@evil.example`,
    'x',
    `${ACCOUNT}; img-src *`,
  ]) {
    process.env.R2_ACCOUNT_ID = account;
    assert.equal(getR2Config(), undefined);
    assert.equal(getR2Origin(), undefined);
  }
  process.env.R2_ACCOUNT_ID = ACCOUNT;
  for (const bucket of [
    '../bucket',
    'a',
    'bad_bucket',
    'bucket/other',
    'bucket?query',
    '-bucket',
    'bucket-',
  ]) {
    process.env.R2_BUCKET = bucket;
    assert.equal(getR2Config(), undefined);
  }
});

test('DELETE and HEAD use authenticated full paths, deadlines and no redirects', async (t) => {
  setup(t);
  const deadlines: number[] = [];
  t.mock.method(AbortSignal, 'timeout', (milliseconds: number) => {
    deadlines.push(milliseconds);
    return new AbortController().signal;
  });
  const requests: string[] = [];
  t.mock.method(
    globalThis,
    'fetch',
    async (input: string, init: RequestInit) => {
      requests.push(init.method ?? '');
      assert.equal(input, `https://${HOST}${PATH}`);
      assert.equal(init.redirect, 'error');
      assert.equal(init.cache, 'no-store');
      assert.ok(init.signal instanceof AbortSignal);
      const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
      const canonical = [
        init.method,
        PATH,
        '',
        `host:${HOST}\nx-amz-content-sha256:${EMPTY_HASH}\nx-amz-date:${DATETIME}\n`,
        signedHeaders,
        EMPTY_HASH,
      ].join('\n');
      const headers = new Headers(init.headers);
      assert.equal(
        headers.get('authorization'),
        `AWS4-HMAC-SHA256 Credential=testAccessKey/${SCOPE}, SignedHeaders=${signedHeaders}, Signature=${referenceSignature(canonical)}`,
      );
      return new Response(null, {
        status: 200,
        headers: {
          'content-length': '42',
          'content-type': 'image/png',
          etag: 'test-etag',
        },
      });
    },
  );
  assert.deepEqual(await deleteR2Objects([KEY, KEY], NOW), {
    requested: 1,
    deleted: 1,
    failed: 0,
  });
  assert.deepEqual(await getR2ObjectMetadata(KEY, NOW), {
    size: 42,
    contentType: 'image/png',
    contentDisposition: null,
    etag: 'test-etag',
  });
  assert.deepEqual(requests, ['DELETE', 'HEAD']);
  assert.deepEqual(deadlines, [10_000, 10_000]);
});

test('HEAD distinguishes missing objects from failures; deletion retains failed counts', async (t) => {
  setup(t);
  t.mock.method(console, 'error', () => undefined);
  const fetchMock = t.mock.method(
    globalThis,
    'fetch',
    async () => new Response(null, { status: 404 }),
  );
  assert.equal(await getR2ObjectMetadata('file', NOW), undefined);
  assert.deepEqual(await deleteR2Objects(['file'], NOW), {
    requested: 1,
    deleted: 1,
    failed: 0,
  });
  fetchMock.mock.mockImplementation(
    async () => new Response(null, { status: 403 }),
  );
  await assert.rejects(getR2ObjectMetadata('file', NOW), /HTTP 403/);
  assert.deepEqual(await deleteR2Objects(['file'], NOW), {
    requested: 1,
    deleted: 0,
    failed: 1,
  });
  for (const size of ['', '-1', '1.5', '9007199254740992']) {
    fetchMock.mock.mockImplementation(
      async () => new Response(null, { headers: { 'content-length': size } }),
    );
    await assert.rejects(getR2ObjectMetadata('file', NOW), /object size/);
  }
  fetchMock.mock.mockImplementation(async () => {
    throw new DOMException('Timed out', 'TimeoutError');
  });
  assert.deepEqual(await deleteR2Objects(['file', 'other'], NOW), {
    requested: 2,
    deleted: 0,
    failed: 2,
  });
  await assert.rejects(getR2ObjectMetadata('file', NOW), /Timed out/);
});

test('CSP allows only the configured R2 origin and same-origin workers', async (t) => {
  setup(t);
  const { default: config } = await import('../next.config');
  const routes = await config.headers?.();
  const csp = routes?.[0].headers.find(
    (header) => header.key === 'Content-Security-Policy',
  )?.value;
  assert.ok(csp);
  assert.ok(csp.split('; ').includes("worker-src 'self'"));
  for (const directive of ['img-src', 'connect-src']) {
    const policy: string | undefined = csp
      .split('; ')
      .find((entry) => entry.startsWith(`${directive} `));
    assert.ok(policy?.includes(`https://${HOST}`));
    assert.equal(policy?.includes('*'), false);
  }
});

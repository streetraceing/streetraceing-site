import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getMediaPathPrefix,
  isAllowedMediaType,
  isMediaUploadScope,
  isVercelBlobMediaUrl,
  normalizeMediaUrls,
} from '../utils/media';

const firstBlobUrl =
  'https://example.public.blob.vercel-storage.com/media/dev-updates/first.webp';
const secondBlobUrl =
  'https://example.public.blob.vercel-storage.com/media/dev-updates/second.webp';

test('media validation accepts only supported source types and public Blob URLs', () => {
  assert.equal(isAllowedMediaType('image/jpeg'), true);
  assert.equal(isAllowedMediaType('image/svg+xml'), false);
  assert.equal(isVercelBlobMediaUrl(firstBlobUrl), true);
  assert.equal(isVercelBlobMediaUrl('https://example.com/image.webp'), false);
  assert.equal(isVercelBlobMediaUrl('javascript:alert(1)'), false);
});

test('media URL normalization deduplicates, filters, and limits values', () => {
  assert.deepEqual(
    normalizeMediaUrls(
      [
        firstBlobUrl,
        firstBlobUrl,
        'https://example.com/image.webp',
        secondBlobUrl,
      ],
      1,
    ),
    [firstBlobUrl],
  );
  assert.deepEqual(normalizeMediaUrls('not-an-array', 4), []);
});

test('media upload scopes restrict project path generation', () => {
  const projectScope = { type: 'project', projectSlug: 'farsight' } as const;

  assert.equal(isMediaUploadScope({ type: 'dev-update' }), true);
  assert.equal(isMediaUploadScope(projectScope), true);
  assert.equal(
    isMediaUploadScope({ type: 'project', projectSlug: '../private' }),
    false,
  );
  assert.equal(getMediaPathPrefix(projectScope), 'media/projects/farsight/');
});

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getCloudinaryPublicIdFromUrl,
  getMediaPublicIdPrefix,
  isAllowedMediaType,
  isCloudinaryMediaUrl,
  isMediaUploadScope,
  normalizeMediaUrls,
} from '../utils/media';

const firstCloudinaryUrl =
  'https://res.cloudinary.com/student-cloud/image/upload/v1760000000/streetraceing/media/dev-updates/first.webp';
const secondCloudinaryUrl =
  'https://res.cloudinary.com/student-cloud/image/upload/v1760000001/streetraceing/media/dev-updates/second.webp';

test('media validation accepts supported source types and owned Cloudinary paths', () => {
  assert.equal(isAllowedMediaType('image/jpeg'), true);
  assert.equal(isAllowedMediaType('image/svg+xml'), false);
  assert.equal(isCloudinaryMediaUrl(firstCloudinaryUrl), true);
  assert.equal(isCloudinaryMediaUrl('https://example.com/image.webp'), false);
  assert.equal(
    isCloudinaryMediaUrl(
      'https://res.cloudinary.com/student-cloud/image/upload/v1/other/image.webp',
    ),
    false,
  );
  assert.equal(isCloudinaryMediaUrl('javascript:alert(1)'), false);
});

test('media URL normalization deduplicates, filters, and limits values', () => {
  assert.deepEqual(
    normalizeMediaUrls(
      [
        firstCloudinaryUrl,
        firstCloudinaryUrl,
        'https://example.com/image.webp',
        secondCloudinaryUrl,
      ],
      1,
    ),
    [firstCloudinaryUrl],
  );
  assert.deepEqual(normalizeMediaUrls('not-an-array', 4), []);
});

test('media upload scopes restrict project paths and Cloudinary ownership', () => {
  const projectScope = { type: 'project', projectSlug: 'farsight' } as const;

  assert.equal(isMediaUploadScope({ type: 'dev-update' }), true);
  assert.equal(isMediaUploadScope(projectScope), true);
  assert.equal(
    isMediaUploadScope({ type: 'project', projectSlug: '../private' }),
    false,
  );
  assert.equal(
    getMediaPublicIdPrefix(projectScope),
    'streetraceing/media/projects/farsight/',
  );
  assert.equal(
    getCloudinaryPublicIdFromUrl(firstCloudinaryUrl, 'student-cloud'),
    'streetraceing/media/dev-updates/first',
  );
  assert.equal(
    getCloudinaryPublicIdFromUrl(firstCloudinaryUrl, 'another-cloud'),
    undefined,
  );
});

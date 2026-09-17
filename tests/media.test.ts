import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getCloudinaryDownloadUrl,
  getCloudinaryImageInfoUrl,
  getCloudinaryPublicIdFromUrl,
  getCloudinarySquareImageUrl,
  getMediaPublicIdPrefix,
  getMediaAssetIdentity,
  getRemovedMediaUrls,
  isAllowedMediaType,
  isCloudinaryMediaUrl,
  isMediaUploadScope,
  MAX_DEV_UPDATE_IMAGES,
  MAX_MEDIA_IMAGES,
  MAX_PROJECT_IMAGES,
  normalizeMediaUrls,
  parseMediaUrls,
} from '../utils/media';

const firstCloudinaryUrl =
  'https://res.cloudinary.com/student-cloud/image/upload/v1760000000/streetraceing/media/dev-updates/first.jpg';
const secondCloudinaryUrl =
  'https://res.cloudinary.com/student-cloud/image/upload/v1760000001/streetraceing/media/dev-updates/second.webp';

test('news and project media share the 20-image limit', () => {
  assert.equal(MAX_MEDIA_IMAGES, 20);
  assert.equal(MAX_DEV_UPDATE_IMAGES, MAX_MEDIA_IMAGES);
  assert.equal(MAX_PROJECT_IMAGES, MAX_MEDIA_IMAGES);
});

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

test('mutation arrays are required, bounded and never silently filtered', () => {
  for (const value of [
    undefined,
    null,
    'invalid',
    {},
    [firstCloudinaryUrl, 42],
    [firstCloudinaryUrl, 'https://example.com/image.jpg'],
  ]) {
    assert.equal(
      parseMediaUrls(value, MAX_MEDIA_IMAGES, 'student-cloud'),
      undefined,
    );
  }
  assert.equal(
    parseMediaUrls(
      Array.from({ length: 21 }, () => firstCloudinaryUrl),
      MAX_MEDIA_IMAGES,
      'student-cloud',
    ),
    undefined,
  );
  assert.deepEqual(parseMediaUrls([], MAX_MEDIA_IMAGES, 'student-cloud'), []);
  assert.equal(
    parseMediaUrls([firstCloudinaryUrl], MAX_MEDIA_IMAGES),
    undefined,
  );
  assert.equal(
    parseMediaUrls([firstCloudinaryUrl], MAX_MEDIA_IMAGES, 'other-cloud'),
    undefined,
  );
});

test('mutations canonicalize transformed originals and compare asset identities', () => {
  const square = getCloudinarySquareImageUrl(firstCloudinaryUrl, 160);
  const version = firstCloudinaryUrl.replace('v1760000000', 'v1760000002');
  const format = firstCloudinaryUrl.replace('.jpg', '.webp');
  const encoded = firstCloudinaryUrl.replace('/first.jpg', '/%66irst.jpg');
  assert.deepEqual(
    parseMediaUrls([square, version, format, encoded], 20, ' student-cloud '),
    [firstCloudinaryUrl],
  );
  assert.equal(getMediaAssetIdentity(square), getMediaAssetIdentity(version));
  assert.deepEqual(
    getRemovedMediaUrls(
      [firstCloudinaryUrl, secondCloudinaryUrl],
      [square, version, format],
      'student-cloud',
    ),
    [secondCloudinaryUrl],
  );
  assert.notEqual(
    getMediaAssetIdentity(firstCloudinaryUrl),
    getMediaAssetIdentity(
      firstCloudinaryUrl.replace('student-cloud', 'other-cloud'),
    ),
  );
});

test('mutation URLs reject credentials, ports, query strings and ambiguous asset paths', () => {
  for (const value of [
    firstCloudinaryUrl.replace('https://', 'https://user:password@'),
    firstCloudinaryUrl.replace('.com/', '.com:444/'),
    `${firstCloudinaryUrl}?download=1`,
    `${firstCloudinaryUrl}#fragment`,
    firstCloudinaryUrl.replace('/first.jpg', '/a%2Fb.jpg'),
    firstCloudinaryUrl.replace('/first.jpg', '/a%5Cb.jpg'),
    firstCloudinaryUrl.replace('/first.jpg', '/a%00b.jpg'),
    firstCloudinaryUrl.replace('/first.jpg', '/a%ZZ.jpg'),
    firstCloudinaryUrl.replace('/first.jpg', '//first.jpg'),
    firstCloudinaryUrl.replace('/first.jpg', `/${'a'.repeat(256)}.jpg`),
  ]) {
    assert.equal(parseMediaUrls([value], 20, 'student-cloud'), undefined);
  }
});

test('gallery transformations keep the original public ID', () => {
  const squareUrl = getCloudinarySquareImageUrl(firstCloudinaryUrl, 1_080);
  const thumbnailUrl = getCloudinarySquareImageUrl(firstCloudinaryUrl, 160);
  const infoUrl = getCloudinaryImageInfoUrl(firstCloudinaryUrl);
  const downloadUrl = getCloudinaryDownloadUrl(firstCloudinaryUrl);

  assert.match(
    squareUrl,
    /\/image\/upload\/c_fill,g_auto,h_1080,w_1080,q_auto:good,f_auto\/v1760000000\//,
  );
  assert.match(
    thumbnailUrl,
    /\/image\/upload\/c_fill,g_auto,h_160,w_160,q_auto:good,f_auto\/v1760000000\//,
  );
  assert.match(infoUrl, /\/image\/upload\/fl_getinfo\/v1760000000\//);
  assert.match(downloadUrl, /\/image\/upload\/fl_attachment\/v1760000000\//);
  assert.equal(
    getCloudinaryPublicIdFromUrl(squareUrl, 'student-cloud'),
    'streetraceing/media/dev-updates/first',
  );
});

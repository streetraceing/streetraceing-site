import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_DEV_UPDATE_CONTENT_LENGTH,
  MAX_DEV_UPDATE_TITLE_LENGTH,
  parseDevUpdateInput,
} from '../utils/dev-update-input';

test('normalizes a valid Dev Note payload', () => {
  const result = parseDevUpdateInput(
    {
      title: '  Release note  ',
      content: '  Everything is stable.  ',
      topic: 'site',
      imageUrls: [],
      uploadedImageUrls: [],
    },
    undefined,
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.ok ? result.input : undefined, {
    title: 'Release note',
    content: 'Everything is stable.',
    topic: 'site',
    imageUrls: [],
    uploadedImageUrls: [],
  });
});

test('Dev Note replacement requires explicit valid images, not malformed clears', () => {
  for (const imageUrls of [
    undefined,
    null,
    {},
    'bad',
    [42],
    Array.from({ length: 21 }, () => 'bad'),
  ]) {
    assert.equal(
      parseDevUpdateInput(
        { content: 'Valid', topic: 'site', imageUrls },
        'student-cloud',
      ).ok,
      false,
    );
  }
  assert.equal(
    parseDevUpdateInput(
      {
        content: 'Valid',
        topic: 'site',
        imageUrls: [],
        uploadedImageUrls: null,
      },
      'student-cloud',
    ).ok,
    false,
  );
  assert.equal(
    parseDevUpdateInput(
      { content: 'Valid', topic: 'site', imageUrls: [] },
      'student-cloud',
    ).ok,
    true,
  );
});

test('uploaded media subset uses canonical identities rather than URL equality', () => {
  const original =
    'https://res.cloudinary.com/student-cloud/image/upload/v1/streetraceing/media/dev-updates/first.jpg';
  const transformed = original.replace('/upload/', '/upload/c_fill,w_160/');
  const result = parseDevUpdateInput(
    {
      content: 'Valid',
      topic: 'site',
      imageUrls: [original],
      uploadedImageUrls: [transformed],
    },
    'student-cloud',
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.input.imageUrls, [original]);
    assert.deepEqual(result.input.uploadedImageUrls, [original]);
  }
});

test('rejects invalid Dev Note content and overlong titles', () => {
  const invalidContent = parseDevUpdateInput(
    {
      content: 'a'.repeat(MAX_DEV_UPDATE_CONTENT_LENGTH + 1),
      topic: 'site',
      imageUrls: [],
    },
    undefined,
  );
  const invalidTitle = parseDevUpdateInput(
    {
      title: 'a'.repeat(MAX_DEV_UPDATE_TITLE_LENGTH + 1),
      content: 'Valid content',
      topic: 'site',
      imageUrls: [],
    },
    undefined,
  );

  assert.equal(invalidContent.ok, false);
  assert.equal(
    invalidContent.ok ? undefined : invalidContent.reason,
    'invalid',
  );
  assert.equal(invalidTitle.ok, false);
  assert.equal(
    invalidTitle.ok ? undefined : invalidTitle.reason,
    'title-too-long',
  );
});

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

test('rejects invalid Dev Note content and overlong titles', () => {
  const invalidContent = parseDevUpdateInput(
    {
      content: 'a'.repeat(MAX_DEV_UPDATE_CONTENT_LENGTH + 1),
      topic: 'site',
    },
    undefined,
  );
  const invalidTitle = parseDevUpdateInput(
    {
      title: 'a'.repeat(MAX_DEV_UPDATE_TITLE_LENGTH + 1),
      content: 'Valid content',
      topic: 'site',
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

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isJsonObject,
  readBoundedResponseText,
  readJsonBody,
} from '../lib/api-http';

test('reads a JSON request within the configured byte limit', async () => {
  const result = await readJsonBody(
    new Request('https://example.com/api', {
      method: 'POST',
      body: JSON.stringify({ value: 'тест' }),
    }),
    128,
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.ok ? result.value : undefined, { value: 'тест' });
});

test('rejects streamed JSON after the actual byte limit is exceeded', async () => {
  const result = await readJsonBody(
    new Request('https://example.com/api', {
      method: 'POST',
      body: JSON.stringify({ value: 'a'.repeat(32) }),
    }),
    16,
  );

  assert.deepEqual(result, { ok: false, reason: 'too-large' });
});

test('rejects malformed JSON and distinguishes plain objects', async () => {
  const result = await readJsonBody(
    new Request('https://example.com/api', {
      method: 'POST',
      body: '{broken',
    }),
    128,
  );

  assert.deepEqual(result, { ok: false, reason: 'invalid' });
  assert.equal(isJsonObject({}), true);
  assert.equal(isJsonObject([]), false);
  assert.equal(isJsonObject(null), false);
});

test('bounds external response text even without a content length', async () => {
  assert.equal(
    await readBoundedResponseText(new Response('small'), 16),
    'small',
  );
  assert.equal(
    await readBoundedResponseText(new Response('a'.repeat(32)), 16),
    undefined,
  );
});

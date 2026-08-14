import assert from 'node:assert/strict';
import test from 'node:test';

import { getJsonError, isJsonObject, readJsonResponse } from '../utils/json';

test('recognizes JSON objects and extracts API errors', () => {
  assert.equal(isJsonObject({ error: 'Failed' }), true);
  assert.equal(isJsonObject([]), false);
  assert.equal(getJsonError({ error: 'Failed' }), 'Failed');
  assert.equal(getJsonError({ error: 500 }), undefined);
});

test('reads valid JSON and safely handles malformed responses', async () => {
  assert.deepEqual(
    await readJsonResponse(
      new Response(JSON.stringify({ value: true }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
    { value: true },
  );
  assert.equal(await readJsonResponse(new Response('{broken')), undefined);
});

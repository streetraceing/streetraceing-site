import assert from 'node:assert/strict';
import test from 'node:test';

import { toggleMarkdownDecoration } from '../utils/markdown';

test('wraps a selected Markdown fragment with underline delimiters', () => {
  assert.deepEqual(toggleMarkdownDecoration('hello', 0, 5, '++'), {
    value: '++hello++',
    selectionStart: 2,
    selectionEnd: 7,
  });
});

test('removes matching strikethrough delimiters around a selection', () => {
  assert.deepEqual(toggleMarkdownDecoration('~~hello~~', 2, 7, '~~'), {
    value: 'hello',
    selectionStart: 0,
    selectionEnd: 5,
  });
});

test('places the caret between delimiters when no text is selected', () => {
  assert.deepEqual(toggleMarkdownDecoration('hello', 5, 5, '++'), {
    value: 'hello++++',
    selectionStart: 7,
    selectionEnd: 7,
  });
});

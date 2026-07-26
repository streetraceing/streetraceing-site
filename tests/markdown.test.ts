import assert from 'node:assert/strict';
import test from 'node:test';
import { fromMarkdown } from 'mdast-util-from-markdown';

import {
  insertMarkdownLink,
  remarkGfmTables,
  toggleMarkdownDecoration,
  toggleMarkdownLinePrefix,
  wrapMarkdownBlock,
} from '../utils/markdown';

test('turns a GFM table into a table AST with aligned Markdown cells', () => {
  const content = [
    '| Name | State |',
    '| :--- | :---: |',
    '| **Package** | `ready` |',
  ].join('\n');
  const tree = fromMarkdown(content);

  remarkGfmTables()(tree as never, { value: content });

  const table = tree.children[0] as unknown as {
    type: string;
    align: Array<string | null>;
    children: Array<{
      children: Array<{ children: Array<{ type: string }> }>;
    }>;
  };

  assert.equal(table.type, 'table');
  assert.deepEqual(table.align, ['left', 'center']);
  assert.equal(table.children[1]?.children[0]?.children[0]?.type, 'strong');
});

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

test('toggles a Markdown prefix across selected lines', () => {
  assert.deepEqual(toggleMarkdownLinePrefix('one\ntwo', 0, 7, '- '), {
    value: '- one\n- two',
    selectionStart: 0,
    selectionEnd: 11,
  });

  assert.deepEqual(toggleMarkdownLinePrefix('- one\n- two', 0, 11, '- '), {
    value: 'one\ntwo',
    selectionStart: 0,
    selectionEnd: 7,
  });
});

test('wraps a selection in a fenced Markdown block', () => {
  assert.deepEqual(
    wrapMarkdownBlock('const x = 1;', 0, 12, '```\n', '\n```', 'code'),
    {
      value: '```\nconst x = 1;\n```',
      selectionStart: 4,
      selectionEnd: 16,
    },
  );
});

test('inserts a Markdown link and selects its URL', () => {
  assert.deepEqual(
    insertMarkdownLink('HeroUI', 0, 6, 'link text', 'https://'),
    {
      value: '[HeroUI](https://)',
      selectionStart: 9,
      selectionEnd: 17,
    },
  );
});

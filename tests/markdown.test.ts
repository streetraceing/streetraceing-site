import assert from 'node:assert/strict';
import test from 'node:test';
import { fromMarkdown } from 'mdast-util-from-markdown';

import {
  createMarkdownHeadingId,
  extractMarkdownHeadings,
  insertMarkdownLink,
  isMarkdownDocumentHref,
  remarkHeadingIds,
  remarkGfmTables,
  remarkSafeHtml,
  toggleMarkdownDecoration,
  toggleMarkdownLinePrefix,
  wrapMarkdownBlock,
} from '../utils/markdown';
import { parseSafeHtmlFragment } from '../utils/safe-html';

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

test('creates deterministic heading anchors and section navigation data', () => {
  const content = `# Setup

## API & Setup

## API & Setup`;
  const headings = extractMarkdownHeadings(content);
  const tree = fromMarkdown(content);

  remarkHeadingIds({ prefix: 'docs' })(tree as never);

  assert.deepEqual(headings, [
    { depth: 1, text: 'Setup', slug: 'setup' },
    { depth: 2, text: 'API & Setup', slug: 'api-setup' },
    { depth: 2, text: 'API & Setup', slug: 'api-setup-1' },
  ]);
  assert.equal(
    (
      tree.children[1] as unknown as {
        data?: { hProperties?: { id?: string } };
      }
    ).data?.hProperties?.id,
    'docs-api-setup',
  );
  assert.equal(
    createMarkdownHeadingId('docs', '#API%20%26%20Setup'),
    'docs-api-setup',
  );
});

test('recognizes Markdown documents without treating anchors as files', () => {
  assert.equal(isMarkdownDocumentHref('../guide/SETUP.md#install'), true);
  assert.equal(isMarkdownDocumentHref('https://example.com/readme.txt'), false);
  assert.equal(isMarkdownDocumentHref('#install'), false);
});

test('converts allowed raw HTML into sanitized Markdown render nodes', () => {
  const content =
    '<p align="center"><a href="./docs/guide.md" onclick="alert(1)"><img src="./assets/preview.png" alt="Preview" width="900" onerror="alert(1)" /></a></p>';
  const tree = fromMarkdown(content);

  remarkSafeHtml()(tree as never);

  const paragraph = tree.children[0] as unknown as {
    data?: {
      hName?: string;
      hProperties?: Record<string, unknown>;
      hChildren?: Array<{
        type: string;
        tagName?: string;
        properties?: Record<string, unknown>;
        children?: Array<{
          type: string;
          tagName?: string;
          properties?: Record<string, unknown>;
        }>;
      }>;
    };
  };
  const link = paragraph.data?.hChildren?.[0];
  const image = link?.children?.[0];

  assert.equal(paragraph.data?.hName, 'p');
  assert.deepEqual(paragraph.data?.hProperties?.className, ['text-center']);
  assert.equal(link?.tagName, 'a');
  assert.deepEqual(link?.properties, { href: './docs/guide.md' });
  assert.equal(image?.tagName, 'img');
  assert.deepEqual(image?.properties, {
    src: './assets/preview.png',
    alt: 'Preview',
    width: 900,
  });
});

test('drops active HTML content and unsafe URL schemes', () => {
  const nodes = parseSafeHtmlFragment(
    '<script src="https://example.com/x.js">alert(1)</script><img src="data:image/svg+xml,evil" onerror="alert(1)" /><a href="javascript:alert(1)" style="color:red">Safe label</a>',
  );

  assert.equal(nodes.length, 2);
  assert.deepEqual(nodes[0], {
    type: 'element',
    tagName: 'img',
    properties: {},
    children: [],
  });
  assert.deepEqual(nodes[1], {
    type: 'element',
    tagName: 'a',
    properties: {},
    children: [{ type: 'text', value: 'Safe label' }],
  });
});

test('includes safe HTML headings in generated documentation anchors', () => {
  assert.deepEqual(extractMarkdownHeadings('<h2>HTML section</h2>'), [
    { depth: 2, text: 'HTML section', slug: 'html-section' },
  ]);
});

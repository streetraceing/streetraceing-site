import { fromMarkdown } from 'mdast-util-from-markdown';

type MarkdownNode = {
  type: string;
  depth?: number;
  value?: string;
  children?: MarkdownNode[];
  align?: Array<'center' | 'left' | 'right' | null>;
  data?: {
    hName?: string;
    hProperties?: {
      id?: string;
    };
  };
  position?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
};

type MarkdownFile = {
  value?: unknown;
};

type DecorationDelimiter = '++' | '~~' | '**' | '*' | '`';

export type MarkdownSelectionUpdate = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

const DECORATION_PATTERN = /(~~|\+\+)(?!\s)([\s\S]*?\S)\1/g;
const TABLE_SEPARATOR_PATTERN = /^(:)?(-{3,})(:)?$/;

function decorateTextNode(node: MarkdownNode) {
  if (node.type !== 'text' || typeof node.value !== 'string') {
    return undefined;
  }

  const children: MarkdownNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  DECORATION_PATTERN.lastIndex = 0;

  while ((match = DECORATION_PATTERN.exec(node.value)) !== null) {
    if (match.index > cursor) {
      children.push({
        type: 'text',
        value: node.value.slice(cursor, match.index),
      });
    }

    const delimiter = match[1] as '++' | '~~';

    children.push({
      type: delimiter === '~~' ? 'strikethrough' : 'underline',
      data: {
        hName: delimiter === '~~' ? 'del' : 'u',
      },
      children: [{ type: 'text', value: match[2] }],
    });
    cursor = match.index + match[0].length;
  }

  if (children.length === 0) {
    return undefined;
  }

  if (cursor < node.value.length) {
    children.push({ type: 'text', value: node.value.slice(cursor) });
  }

  return children;
}

function transformDecorations(node: MarkdownNode) {
  if (!node.children) {
    return;
  }

  const nextChildren: MarkdownNode[] = [];

  for (const child of node.children) {
    const decoratedChildren = decorateTextNode(child);

    if (decoratedChildren) {
      nextChildren.push(...decoratedChildren);
      continue;
    }

    transformDecorations(child);
    nextChildren.push(child);
  }

  node.children = nextChildren;
}

export function remarkTextDecorations() {
  return (tree: MarkdownNode) => {
    transformDecorations(tree);
  };
}

function splitTableRow(line: string) {
  let value = line.trim();

  if (value.startsWith('|')) {
    value = value.slice(1);
  }

  if (value.endsWith('|')) {
    value = value.slice(0, -1);
  }

  const cells: string[] = [];
  let cell = '';
  let isEscaped = false;
  let codeDelimiterLength = 0;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (character === '\\' && !isEscaped) {
      cell += character;
      isEscaped = true;
      continue;
    }

    if (character === '`' && !isEscaped) {
      let delimiterLength = 1;

      while (value[index + delimiterLength] === '`') {
        delimiterLength += 1;
      }

      if (codeDelimiterLength === 0) {
        codeDelimiterLength = delimiterLength;
      } else if (codeDelimiterLength === delimiterLength) {
        codeDelimiterLength = 0;
      }

      cell += '`'.repeat(delimiterLength);
      index += delimiterLength - 1;
      continue;
    }

    if (character === '|' && !isEscaped && codeDelimiterLength === 0) {
      cells.push(cell.trim());
      cell = '';
      continue;
    }

    cell += character;
    isEscaped = false;
  }

  cells.push(cell.trim());
  return cells;
}

function hasTableCellBoundary(line: string) {
  let isEscaped = false;
  let codeDelimiterLength = 0;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '\\' && !isEscaped) {
      isEscaped = true;
      continue;
    }

    if (character === '`' && !isEscaped) {
      let delimiterLength = 1;

      while (line[index + delimiterLength] === '`') {
        delimiterLength += 1;
      }

      if (codeDelimiterLength === 0) {
        codeDelimiterLength = delimiterLength;
      } else if (codeDelimiterLength === delimiterLength) {
        codeDelimiterLength = 0;
      }

      index += delimiterLength - 1;
      continue;
    }

    if (character === '|' && !isEscaped && codeDelimiterLength === 0) {
      return true;
    }

    isEscaped = false;
  }

  return false;
}

function getTableAlignment(value: string) {
  const match = value.match(TABLE_SEPARATOR_PATTERN);

  if (!match) {
    return undefined;
  }

  if (match[1] && match[3]) {
    return 'center' as const;
  }

  if (match[1]) {
    return 'left' as const;
  }

  if (match[3]) {
    return 'right' as const;
  }

  return null;
}

function parseTableCell(value: string) {
  const firstNode = fromMarkdown(value).children[0] as MarkdownNode | undefined;

  return firstNode?.type === 'paragraph' && firstNode.children
    ? firstNode.children
    : [{ type: 'text', value }];
}

function createTableRow(values: string[], columnCount: number): MarkdownNode {
  return {
    type: 'tableRow',
    children: Array.from({ length: columnCount }, (_value, index) => ({
      type: 'tableCell',
      children: parseTableCell(values[index] ?? ''),
    })),
  };
}

function createTableNode(block: string) {
  const lines = block.split(/\r?\n/);

  if (lines.length < 2) {
    return undefined;
  }

  const header = splitTableRow(lines[0] ?? '');
  const separator = splitTableRow(lines[1] ?? '');

  if (!header.length || header.length !== separator.length) {
    return undefined;
  }

  const align = separator.map(getTableAlignment);

  if (align.some((value) => value === undefined)) {
    return undefined;
  }

  let tableEnd = 2;

  while (
    tableEnd < lines.length &&
    hasTableCellBoundary(lines[tableEnd] ?? '')
  ) {
    tableEnd += 1;
  }

  const bodyRows = lines.slice(2, tableEnd).map(splitTableRow);

  return {
    table: {
      type: 'table',
      align: align as Array<'center' | 'left' | 'right' | null>,
      children: [
        createTableRow(header, header.length),
        ...bodyRows.map((row) => createTableRow(row, header.length)),
      ],
    },
    remainder: lines.slice(tableEnd).join('\n'),
  };
}

function getSourceBlock(node: MarkdownNode, source: string) {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;

  return typeof start === 'number' && typeof end === 'number'
    ? source.slice(start, end)
    : undefined;
}

function transformTables(node: MarkdownNode, source: string) {
  if (!node.children) {
    return;
  }

  node.children = node.children.flatMap((child) => {
    const parsedTable =
      child.type === 'paragraph'
        ? createTableNode(getSourceBlock(child, source) ?? '')
        : undefined;

    if (parsedTable) {
      if (!parsedTable.remainder) {
        return parsedTable.table;
      }

      const remainderTree = fromMarkdown(
        parsedTable.remainder,
      ) as unknown as MarkdownNode;

      transformTables(remainderTree, parsedTable.remainder);

      return [parsedTable.table, ...(remainderTree.children ?? [])];
    }

    transformTables(child, source);
    return child;
  });
}

export function remarkGfmTables() {
  return (tree: MarkdownNode, file: MarkdownFile) => {
    const source = typeof file.value === 'string' ? file.value : undefined;

    if (source) {
      transformTables(tree, source);
    }
  };
}

export type MarkdownHeading = {
  depth: number;
  text: string;
  slug: string;
};

type MarkdownHeadingIdOptions = {
  prefix?: string;
};

function getMarkdownNodeText(node: MarkdownNode): string {
  if (typeof node.value === 'string') {
    return node.value;
  }

  return (node.children ?? []).map(getMarkdownNodeText).join('');
}

export function slugifyMarkdownHeading(value: string) {
  const slug = value
    .trim()
    .toLocaleLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return slug || 'section';
}

function collectMarkdownHeadings(tree: MarkdownNode) {
  const headings: MarkdownHeading[] = [];
  const slugCounts = new Map<string, number>();
  const usedSlugs = new Set<string>();

  function visit(node: MarkdownNode) {
    if (node.type === 'heading' && typeof node.depth === 'number') {
      const text = getMarkdownNodeText(node).trim();

      if (text) {
        const baseSlug = slugifyMarkdownHeading(text);
        let duplicateIndex = slugCounts.get(baseSlug) ?? 0;
        let slug =
          duplicateIndex === 0 ? baseSlug : `${baseSlug}-${duplicateIndex}`;

        while (usedSlugs.has(slug)) {
          duplicateIndex += 1;
          slug = `${baseSlug}-${duplicateIndex}`;
        }

        slugCounts.set(baseSlug, duplicateIndex + 1);
        usedSlugs.add(slug);
        headings.push({ depth: node.depth, text, slug });
      }
    }

    for (const child of node.children ?? []) {
      visit(child);
    }
  }

  visit(tree);
  return headings;
}

export function extractMarkdownHeadings(content: string) {
  return collectMarkdownHeadings(
    fromMarkdown(content) as unknown as MarkdownNode,
  );
}

export function createMarkdownHeadingId(prefix: string, fragment: string) {
  let decodedFragment = fragment.replace(/^#/, '');

  try {
    decodedFragment = decodeURIComponent(decodedFragment);
  } catch {
    // Keep malformed fragments readable and deterministic.
  }

  return `${prefix}-${slugifyMarkdownHeading(decodedFragment)}`;
}

export function remarkHeadingIds(options: MarkdownHeadingIdOptions = {}) {
  return (tree: MarkdownNode) => {
    const headings = collectMarkdownHeadings(tree);
    let headingIndex = 0;

    function visit(node: MarkdownNode) {
      if (node.type === 'heading') {
        const heading = headings[headingIndex];
        headingIndex += 1;

        if (heading) {
          node.data = {
            ...node.data,
            hProperties: {
              ...node.data?.hProperties,
              id: options.prefix
                ? `${options.prefix}-${heading.slug}`
                : heading.slug,
            },
          };
        }
      }

      for (const child of node.children ?? []) {
        visit(child);
      }
    }

    visit(tree);
  };
}

export function isMarkdownDocumentHref(value: string) {
  try {
    const url = new URL(value, 'https://markdown.local/');
    return url.pathname.toLocaleLowerCase().endsWith('.md');
  } catch {
    return false;
  }
}

export function toggleMarkdownDecoration(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  delimiter: DecorationDelimiter,
): MarkdownSelectionUpdate {
  const selectedText = value.slice(selectionStart, selectionEnd);
  const delimiterLength = delimiter.length;
  const hasOuterDelimiters =
    selectionStart >= delimiterLength &&
    value.slice(selectionStart - delimiterLength, selectionStart) ===
      delimiter &&
    value.slice(selectionEnd, selectionEnd + delimiterLength) === delimiter;

  if (hasOuterDelimiters) {
    return {
      value:
        value.slice(0, selectionStart - delimiterLength) +
        selectedText +
        value.slice(selectionEnd + delimiterLength),
      selectionStart: selectionStart - delimiterLength,
      selectionEnd: selectionEnd - delimiterLength,
    };
  }

  const inserted = `${delimiter}${selectedText}${delimiter}`;

  return {
    value:
      value.slice(0, selectionStart) + inserted + value.slice(selectionEnd),
    selectionStart: selectionStart + delimiterLength,
    selectionEnd: selectionStart + delimiterLength + selectedText.length,
  };
}

export function toggleMarkdownLinePrefix(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string,
): MarkdownSelectionUpdate {
  const lineStart =
    value.lastIndexOf('\n', Math.max(selectionStart - 1, 0)) + 1;
  const nextLineBreak = value.indexOf('\n', selectionEnd);
  const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
  const selectedLines = value.slice(lineStart, lineEnd);

  if (!selectedLines) {
    return {
      value: value.slice(0, lineStart) + prefix + value.slice(lineStart),
      selectionStart: lineStart + prefix.length,
      selectionEnd: lineStart + prefix.length,
    };
  }

  const lines = selectedLines.split('\n');
  const contentLines = lines.filter((line) => line.length > 0);
  const removePrefix =
    contentLines.length > 0 &&
    contentLines.every((line) => line.startsWith(prefix));
  const transformedLines = lines
    .map((line) => {
      if (!line) {
        return line;
      }

      return removePrefix ? line.slice(prefix.length) : `${prefix}${line}`;
    })
    .join('\n');

  return {
    value: value.slice(0, lineStart) + transformedLines + value.slice(lineEnd),
    selectionStart: lineStart,
    selectionEnd: lineStart + transformedLines.length,
  };
}

export function wrapMarkdownBlock(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  opening: string,
  closing: string,
  placeholder: string,
): MarkdownSelectionUpdate {
  const selectedText = value.slice(selectionStart, selectionEnd) || placeholder;
  const inserted = `${opening}${selectedText}${closing}`;

  return {
    value:
      value.slice(0, selectionStart) + inserted + value.slice(selectionEnd),
    selectionStart: selectionStart + opening.length,
    selectionEnd: selectionStart + opening.length + selectedText.length,
  };
}

export function insertMarkdownLink(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  labelPlaceholder: string,
  urlPlaceholder: string,
): MarkdownSelectionUpdate {
  const selectedText = value.slice(selectionStart, selectionEnd);
  const label = selectedText || labelPlaceholder;
  const inserted = `[${label}](${urlPlaceholder})`;
  const labelStart = selectionStart + 1;
  const urlStart = selectionStart + label.length + 3;

  return {
    value:
      value.slice(0, selectionStart) + inserted + value.slice(selectionEnd),
    selectionStart: selectedText ? urlStart : labelStart,
    selectionEnd: selectedText
      ? urlStart + urlPlaceholder.length
      : labelStart + label.length,
  };
}

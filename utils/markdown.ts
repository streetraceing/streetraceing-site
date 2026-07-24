type MarkdownNode = {
  type: string;
  value?: string;
  children?: MarkdownNode[];
  data?: {
    hName?: string;
  };
};

type DecorationDelimiter = '++' | '~~';

export type MarkdownSelectionUpdate = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

const DECORATION_PATTERN = /(~~|\+\+)(?!\s)([\s\S]*?\S)\1/g;

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

    const delimiter = match[1] as DecorationDelimiter;

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

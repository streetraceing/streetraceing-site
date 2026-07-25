type MarkdownNode = {
  type: string;
  value?: string;
  children?: MarkdownNode[];
  data?: {
    hName?: string;
  };
};

type DecorationDelimiter = '++' | '~~' | '**' | '*' | '`';

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

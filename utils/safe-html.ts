export type SafeHtmlTextNode = {
  type: 'text';
  value: string;
};

export type SafeHtmlElementNode = {
  type: 'element';
  tagName: string;
  properties: Record<string, unknown>;
  children: SafeHtmlNode[];
};

export type SafeHtmlNode = SafeHtmlTextNode | SafeHtmlElementNode;

type ParsedTag = {
  name: string;
  closing: boolean;
  selfClosing: boolean;
  attributes: Map<string, string | true>;
};

const SAFE_TAG_NAMES = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'center',
  'code',
  'dd',
  'del',
  'details',
  'div',
  'dl',
  'dt',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'kbd',
  'li',
  'mark',
  'ol',
  'p',
  'pre',
  's',
  'small',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]);

const VOID_TAG_NAMES = new Set(['br', 'hr', 'img']);
const DROP_CONTENT_TAG_NAMES = new Set([
  'applet',
  'audio',
  'embed',
  'form',
  'frame',
  'frameset',
  'iframe',
  'math',
  'noscript',
  'object',
  'script',
  'style',
  'svg',
  'template',
  'video',
]);

const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  copy: '©',
  gt: '>',
  hellip: '…',
  laquo: '«',
  lt: '<',
  mdash: '—',
  nbsp: '\u00a0',
  ndash: '–',
  quot: '"',
  raquo: '»',
  reg: '®',
};

function decodeHtmlEntities(value: string) {
  return value.replace(
    /&(?:#(\d+)|#x([\da-f]+)|([a-z][\da-z]+));/gi,
    (entity, decimal: string, hexadecimal: string, named: string) => {
      if (decimal || hexadecimal) {
        const codePoint = Number.parseInt(
          decimal || hexadecimal,
          hexadecimal ? 16 : 10,
        );

        if (
          !Number.isFinite(codePoint) ||
          codePoint <= 0 ||
          codePoint > 0x10ffff ||
          (codePoint >= 0xd800 && codePoint <= 0xdfff)
        ) {
          return entity;
        }

        try {
          return String.fromCodePoint(codePoint);
        } catch {
          return entity;
        }
      }

      return HTML_ENTITIES[named.toLowerCase()] ?? entity;
    },
  );
}

function readHtmlToken(value: string, startIndex: number) {
  if (!value.startsWith('<', startIndex)) {
    return undefined;
  }

  if (value.startsWith('<!--', startIndex)) {
    const commentEnd = value.indexOf('-->', startIndex + 4);
    const endIndex = commentEnd === -1 ? value.length : commentEnd + 3;

    return { token: value.slice(startIndex, endIndex), endIndex };
  }

  let quote: '"' | "'" | undefined;

  for (let index = startIndex + 1; index < value.length; index += 1) {
    const character = value[index];

    if (quote) {
      if (character === quote) {
        quote = undefined;
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }

    if (character === '>') {
      return {
        token: value.slice(startIndex, index + 1),
        endIndex: index + 1,
      };
    }
  }

  return undefined;
}

function parseAttributes(value: string) {
  const attributes = new Map<string, string | true>();
  const pattern =
    /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    const name = match[1]?.toLowerCase();

    if (!name || name.startsWith('on')) {
      continue;
    }

    const rawValue = match[2] ?? match[3] ?? match[4];
    attributes.set(
      name,
      rawValue === undefined ? true : decodeHtmlEntities(rawValue),
    );
  }

  return attributes;
}

function parseTag(token: string): ParsedTag | undefined {
  if (
    token.startsWith('<!--') ||
    token.startsWith('<!') ||
    token.startsWith('<?')
  ) {
    return undefined;
  }

  const match = token.match(/^<\s*(\/)?\s*([a-z][\w:-]*)([\s\S]*?)>$/i);

  if (!match) {
    return undefined;
  }

  const name = match[2]?.toLowerCase();

  if (!name) {
    return undefined;
  }

  const attributeSource = match[3] ?? '';

  return {
    name,
    closing: Boolean(match[1]),
    selfClosing: /\/\s*$/.test(attributeSource) || VOID_TAG_NAMES.has(name),
    attributes: parseAttributes(attributeSource.replace(/\/\s*$/, '')),
  };
}

function sanitizeUrl(value: string, kind: 'href' | 'src') {
  const decoded = decodeHtmlEntities(value).trim();
  const compact = Array.from(decoded)
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint > 0x20 && codePoint !== 0x7f;
    })
    .join('');
  const scheme = compact.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLowerCase();

  if (!scheme) {
    return decoded;
  }

  if (scheme === 'http' || scheme === 'https') {
    return decoded;
  }

  if (kind === 'href' && scheme === 'mailto') {
    return decoded;
  }

  return undefined;
}

function getBoundedInteger(value: string | true | undefined, maximum = 10_000) {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return undefined;
  }

  const number = Number.parseInt(value, 10);
  return number > 0 && number <= maximum ? number : undefined;
}

function getAlignmentClass(value: string | true | undefined) {
  if (typeof value !== 'string') {
    return undefined;
  }

  switch (value.toLowerCase()) {
    case 'center':
      return 'text-center';
    case 'right':
      return 'text-right';
    case 'justify':
      return 'text-justify';
    case 'left':
      return 'text-left';
    default:
      return undefined;
  }
}

function getSafeProperties(
  tagName: string,
  attributes: Map<string, string | true>,
) {
  const properties: Record<string, unknown> = {};
  const title = attributes.get('title');

  if (typeof title === 'string' && title.length <= 500) {
    properties.title = title;
  }

  if (tagName === 'a') {
    const href = attributes.get('href');

    if (typeof href === 'string') {
      const safeHref = sanitizeUrl(href, 'href');

      if (safeHref) {
        properties.href = safeHref;
      }
    }
  }

  if (tagName === 'img') {
    const src = attributes.get('src');
    const alt = attributes.get('alt');
    const width = getBoundedInteger(attributes.get('width'));
    const height = getBoundedInteger(attributes.get('height'));

    if (typeof src === 'string') {
      const safeSrc = sanitizeUrl(src, 'src');

      if (safeSrc) {
        properties.src = safeSrc;
      }
    }

    if (typeof alt === 'string' && alt.length <= 1_000) {
      properties.alt = alt;
    }

    if (width) {
      properties.width = width;
    }

    if (height) {
      properties.height = height;
    }
  }

  if (tagName === 'details' && attributes.has('open')) {
    properties.open = true;
  }

  if (tagName === 'ol') {
    const start = getBoundedInteger(attributes.get('start'), 1_000_000);

    if (start) {
      properties.start = start;
    }

    if (attributes.has('reversed')) {
      properties.reversed = true;
    }
  }

  if (tagName === 'li') {
    const itemValue = getBoundedInteger(attributes.get('value'), 1_000_000);

    if (itemValue) {
      properties.value = itemValue;
    }
  }

  if (tagName === 'th' || tagName === 'td') {
    const alignment = attributes.get('align');
    const columnSpan = getBoundedInteger(attributes.get('colspan'), 100);
    const rowSpan = getBoundedInteger(attributes.get('rowspan'), 100);

    if (
      alignment === 'left' ||
      alignment === 'center' ||
      alignment === 'right' ||
      alignment === 'justify'
    ) {
      properties.align = alignment;
    }

    if (columnSpan) {
      properties.colSpan = columnSpan;
    }

    if (rowSpan) {
      properties.rowSpan = rowSpan;
    }
  }

  if (tagName === 'p' || tagName === 'div' || tagName === 'center') {
    const alignmentClass =
      tagName === 'center'
        ? 'text-center'
        : getAlignmentClass(attributes.get('align'));

    if (alignmentClass) {
      properties.className = [alignmentClass];
    }
  }

  return properties;
}

function appendText(children: SafeHtmlNode[], value: string) {
  if (!value) {
    return;
  }

  const decoded = decodeHtmlEntities(value);
  const previous = children.at(-1);

  if (previous?.type === 'text') {
    previous.value += decoded;
    return;
  }

  children.push({ type: 'text', value: decoded });
}

export function parseSafeHtmlFragment(value: string) {
  const root: SafeHtmlElementNode = {
    type: 'element',
    tagName: 'div',
    properties: {},
    children: [],
  };
  const stack: Array<{ sourceTagName: string; node: SafeHtmlElementNode }> = [
    { sourceTagName: 'div', node: root },
  ];
  const droppedTags: string[] = [];
  let cursor = 0;

  while (cursor < value.length) {
    const tagStart = value.indexOf('<', cursor);

    if (tagStart === -1) {
      if (droppedTags.length === 0) {
        appendText(
          stack.at(-1)?.node.children ?? root.children,
          value.slice(cursor),
        );
      }
      break;
    }

    if (tagStart > cursor && droppedTags.length === 0) {
      appendText(
        stack.at(-1)?.node.children ?? root.children,
        value.slice(cursor, tagStart),
      );
    }

    const tokenResult = readHtmlToken(value, tagStart);

    if (!tokenResult) {
      if (droppedTags.length === 0) {
        appendText(
          stack.at(-1)?.node.children ?? root.children,
          value.slice(tagStart),
        );
      }
      break;
    }

    cursor = tokenResult.endIndex;
    const parsedTag = parseTag(tokenResult.token);

    if (!parsedTag) {
      continue;
    }

    if (droppedTags.length > 0) {
      if (!parsedTag.closing && DROP_CONTENT_TAG_NAMES.has(parsedTag.name)) {
        droppedTags.push(parsedTag.name);
      } else if (parsedTag.closing && droppedTags.at(-1) === parsedTag.name) {
        droppedTags.pop();
      }
      continue;
    }

    if (!parsedTag.closing && DROP_CONTENT_TAG_NAMES.has(parsedTag.name)) {
      if (!parsedTag.selfClosing) {
        droppedTags.push(parsedTag.name);
      }
      continue;
    }

    if (!SAFE_TAG_NAMES.has(parsedTag.name)) {
      continue;
    }

    if (parsedTag.closing) {
      for (let index = stack.length - 1; index > 0; index -= 1) {
        if (stack[index]?.sourceTagName === parsedTag.name) {
          stack.splice(index);
          break;
        }
      }
      continue;
    }

    const outputTagName =
      parsedTag.name === 'b'
        ? 'strong'
        : parsedTag.name === 'i'
          ? 'em'
          : parsedTag.name === 's'
            ? 'del'
            : parsedTag.name === 'center'
              ? 'div'
              : parsedTag.name;
    const element: SafeHtmlElementNode = {
      type: 'element',
      tagName: outputTagName,
      properties: getSafeProperties(parsedTag.name, parsedTag.attributes),
      children: [],
    };

    stack.at(-1)?.node.children.push(element);

    if (!parsedTag.selfClosing) {
      stack.push({ sourceTagName: parsedTag.name, node: element });
    }
  }

  return root.children;
}

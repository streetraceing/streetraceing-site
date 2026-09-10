export type PasswordOptions = {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
};

export type TextDiffLine = {
  type: 'same' | 'added' | 'removed';
  value: string;
};

export type ColorContrastResult = {
  foreground: string;
  background: string;
  ratio: number;
  normalAA: boolean;
  normalAAA: boolean;
  largeAA: boolean;
  largeAAA: boolean;
};

const PASSWORD_SETS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/~',
};
const AMBIGUOUS_CHARACTERS = new Set(['0', 'O', 'o', '1', 'I', 'l', '|']);
const TRACKING_PARAMETER_PATTERNS = [
  /^utm_/i,
  /^mc_/i,
  /^(?:fbclid|gclid|dclid|msclkid|yclid|igshid|ref_src)$/i,
];

function getRandomInteger(maximum: number) {
  if (!Number.isSafeInteger(maximum) || maximum <= 0) {
    throw new RangeError('Maximum must be a positive safe integer.');
  }

  const upperBound = Math.floor(0x1_0000_0000 / maximum) * maximum;
  const values = new Uint32Array(1);
  let value = upperBound;

  while (value >= upperBound) {
    crypto.getRandomValues(values);
    value = values[0] ?? upperBound;
  }

  return value % maximum;
}

function pickRandomCharacter(characters: string) {
  return characters[getRandomInteger(characters.length)] ?? '';
}

function shuffleCharacters(characters: string[]) {
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const replacementIndex = getRandomInteger(index + 1);
    [characters[index], characters[replacementIndex]] = [
      characters[replacementIndex] ?? '',
      characters[index] ?? '',
    ];
  }

  return characters.join('');
}

function getPasswordSets(options: PasswordOptions) {
  const sets = [
    options.lowercase ? PASSWORD_SETS.lowercase : '',
    options.uppercase ? PASSWORD_SETS.uppercase : '',
    options.numbers ? PASSWORD_SETS.numbers : '',
    options.symbols ? PASSWORD_SETS.symbols : '',
  ]
    .filter(Boolean)
    .map((characters) =>
      options.excludeAmbiguous
        ? [...characters]
            .filter((character) => !AMBIGUOUS_CHARACTERS.has(character))
            .join('')
        : characters,
    )
    .filter(Boolean);

  return sets;
}

export function generateSecurePassword(options: PasswordOptions) {
  const sets = getPasswordSets(options);

  if (!Number.isInteger(options.length) || options.length < sets.length) {
    throw new RangeError('Password length is too short.');
  }

  if (sets.length === 0) {
    throw new RangeError('At least one character set is required.');
  }

  const pool = sets.join('');
  const characters = sets.map(pickRandomCharacter);

  while (characters.length < options.length) {
    characters.push(pickRandomCharacter(pool));
  }

  return {
    password: shuffleCharacters(characters),
    entropyBits: Math.floor(options.length * Math.log2(pool.length)),
    poolSize: pool.length,
  };
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(`${normalized}${padding}`);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

export function decodeJwt(value: string) {
  const parts = value.trim().split('.');

  if (parts.length !== 3) {
    throw new Error('JWT must contain three dot-separated parts.');
  }

  const [headerPart, payloadPart] = parts;

  if (!headerPart || !payloadPart) {
    throw new Error('JWT header or payload is empty.');
  }

  const header = JSON.parse(decodeBase64Url(headerPart)) as unknown;
  const payload = JSON.parse(decodeBase64Url(payloadPart)) as unknown;

  return { header, payload };
}

export function bytesToHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

function toPascalCase(value: string) {
  const normalized = value
    .replace(/[^a-zA-Z0-9_$]+(.)?/g, (_match, character: string | undefined) =>
      character ? character.toUpperCase() : '',
    )
    .replace(/^[^a-zA-Z_$]+/, '');

  const fallback = normalized || 'Value';
  return `${fallback[0]?.toUpperCase() ?? 'V'}${fallback.slice(1)}`;
}

function toTypeScriptProperty(value: string) {
  return /^[A-Za-z_$][\w$]*$/.test(value) ? value : JSON.stringify(value);
}

function mergeTypes(types: string[]) {
  const unique = [...new Set(types)];
  return unique.length === 1 ? (unique[0] ?? 'unknown') : unique.join(' | ');
}

function inferTypeScriptType(
  value: unknown,
  name: string,
  declarations: Map<string, string>,
): string {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'unknown[]';
    }

    const itemTypes = value.map((item) =>
      inferTypeScriptType(item, `${name}Item`, declarations),
    );
    const itemType = mergeTypes(itemTypes);

    return itemType.includes(' | ') ? `Array<${itemType}>` : `${itemType}[]`;
  }

  switch (typeof value) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'object': {
      const interfaceName = toPascalCase(name);
      const entries = Object.entries(value as Record<string, unknown>);
      const lines = entries.map(([key, item]) => {
        const propertyType = inferTypeScriptType(
          item,
          `${interfaceName}${toPascalCase(key)}`,
          declarations,
        );
        return `  ${toTypeScriptProperty(key)}: ${propertyType};`;
      });

      declarations.set(
        interfaceName,
        `export interface ${interfaceName} {\n${lines.join('\n')}\n}`,
      );
      return interfaceName;
    }
    default:
      return 'unknown';
  }
}

export function jsonToTypeScript(value: unknown, rootName = 'Root') {
  const declarations = new Map<string, string>();
  const rootType = inferTypeScriptType(value, rootName, declarations);
  const rendered = [...declarations.values()].reverse();

  if (rendered.length === 0) {
    rendered.push(`export type ${toPascalCase(rootName)} = ${rootType};`);
  } else if (rootType.endsWith('[]') || rootType.includes(' | ')) {
    rendered.push(`export type ${toPascalCase(rootName)} = ${rootType};`);
  }

  return rendered.join('\n\n');
}

export function createLineDiff(
  beforeValue: string,
  afterValue: string,
  maximumLines = 500,
): TextDiffLine[] {
  const before = beforeValue.split(/\r?\n/).slice(0, maximumLines);
  const after = afterValue.split(/\r?\n/).slice(0, maximumLines);
  const matrix = Array.from(
    { length: before.length + 1 },
    () => new Uint16Array(after.length + 1),
  );

  for (
    let beforeIndex = before.length - 1;
    beforeIndex >= 0;
    beforeIndex -= 1
  ) {
    const currentRow = matrix[beforeIndex];
    const nextRow = matrix[beforeIndex + 1];

    if (!currentRow || !nextRow) {
      continue;
    }

    for (let afterIndex = after.length - 1; afterIndex >= 0; afterIndex -= 1) {
      currentRow[afterIndex] =
        before[beforeIndex] === after[afterIndex]
          ? (nextRow[afterIndex + 1] ?? 0) + 1
          : Math.max(nextRow[afterIndex] ?? 0, currentRow[afterIndex + 1] ?? 0);
    }
  }

  const result: TextDiffLine[] = [];
  let beforeIndex = 0;
  let afterIndex = 0;

  while (beforeIndex < before.length && afterIndex < after.length) {
    if (before[beforeIndex] === after[afterIndex]) {
      result.push({ type: 'same', value: before[beforeIndex] ?? '' });
      beforeIndex += 1;
      afterIndex += 1;
      continue;
    }

    const nextBefore = matrix[beforeIndex + 1]?.[afterIndex] ?? 0;
    const nextAfter = matrix[beforeIndex]?.[afterIndex + 1] ?? 0;

    if (nextBefore >= nextAfter) {
      result.push({ type: 'removed', value: before[beforeIndex] ?? '' });
      beforeIndex += 1;
    } else {
      result.push({ type: 'added', value: after[afterIndex] ?? '' });
      afterIndex += 1;
    }
  }

  while (beforeIndex < before.length) {
    result.push({ type: 'removed', value: before[beforeIndex] ?? '' });
    beforeIndex += 1;
  }

  while (afterIndex < after.length) {
    result.push({ type: 'added', value: after[afterIndex] ?? '' });
    afterIndex += 1;
  }

  return result;
}

export function normalizeHexColor(value: string) {
  const normalized = value.trim().replace(/^#/, '');
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((character) => `${character}${character}`)
          .join('')
      : normalized;

  if (!/^[0-9a-f]{6}$/i.test(expanded)) {
    return undefined;
  }

  return `#${expanded.toUpperCase()}`;
}

function getRelativeLuminance(value: string) {
  const channels = [1, 3, 5].map((offset) =>
    Number.parseInt(value.slice(offset, offset + 2), 16),
  );
  const linear = channels.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return (
    (linear[0] ?? 0) * 0.2126 +
    (linear[1] ?? 0) * 0.7152 +
    (linear[2] ?? 0) * 0.0722
  );
}

export function getColorContrast(
  foregroundValue: string,
  backgroundValue: string,
): ColorContrastResult | undefined {
  const foreground = normalizeHexColor(foregroundValue);
  const background = normalizeHexColor(backgroundValue);

  if (!foreground || !background) {
    return undefined;
  }

  const foregroundLuminance = getRelativeLuminance(foreground);
  const backgroundLuminance = getRelativeLuminance(background);
  const ratio =
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);

  return {
    foreground,
    background,
    ratio,
    normalAA: ratio >= 4.5,
    normalAAA: ratio >= 7,
    largeAA: ratio >= 3,
    largeAAA: ratio >= 4.5,
  };
}

export function removeTrackingParameters(value: string) {
  const url = new URL(value);
  const removed: string[] = [];

  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMETER_PATTERNS.some((pattern) => pattern.test(key))) {
      url.searchParams.delete(key);
      removed.push(key);
    }
  }

  return { url: url.toString(), removed };
}

export function buildCronExpression({
  frequency,
  minute,
  hour,
  weekday,
  monthDay,
}: {
  frequency:
    'hourly' | 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'monthly';
  minute: number;
  hour: number;
  weekday: number;
  monthDay: number;
}): string {
  const safeMinute = Math.min(59, Math.max(0, Math.trunc(minute)));
  const safeHour = Math.min(23, Math.max(0, Math.trunc(hour)));
  const safeWeekday = Math.min(6, Math.max(0, Math.trunc(weekday)));
  const safeMonthDay = Math.min(31, Math.max(1, Math.trunc(monthDay)));

  switch (frequency) {
    case 'hourly':
      return `${safeMinute} * * * *`;
    case 'daily':
      return `${safeMinute} ${safeHour} * * *`;
    case 'weekdays':
      return `${safeMinute} ${safeHour} * * 1-5`;
    case 'weekends':
      return `${safeMinute} ${safeHour} * * 0,6`;
    case 'weekly':
      return `${safeMinute} ${safeHour} * * ${safeWeekday}`;
    case 'monthly':
      return `${safeMinute} ${safeHour} ${safeMonthDay} * *`;
    default: {
      const exhaustiveFrequency: never = frequency;
      return exhaustiveFrequency;
    }
  }
}

export type NumberBaseFormats = {
  binary: string;
  octal: string;
  decimal: string;
  hexadecimal: string;
};

const MAX_BASE_INPUT_LENGTH = 64;

/** Parses a non-negative integer written in `fromBase` (2-36) with BigInt
 * precision and returns its representations in the common bases. */
export function convertNumberBase(
  value: string,
  fromBase: number,
): NumberBaseFormats | undefined {
  const trimmed = value.trim().toLowerCase().replace(/[\s_]/g, '');

  if (
    !Number.isInteger(fromBase) ||
    fromBase < 2 ||
    fromBase > 36 ||
    trimmed.length === 0 ||
    trimmed.length > MAX_BASE_INPUT_LENGTH
  ) {
    return undefined;
  }

  const bigBase = BigInt(fromBase);
  let parsed = 0n;

  for (const character of trimmed) {
    const digit = digitToValue(character);

    if (digit === undefined || digit >= fromBase) {
      return undefined;
    }

    parsed = parsed * bigBase + BigInt(digit);
  }

  return {
    binary: parsed.toString(2),
    octal: parsed.toString(8),
    decimal: parsed.toString(10),
    hexadecimal: parsed.toString(16).toUpperCase(),
  };
}

function digitToValue(character: string) {
  const code = character.charCodeAt(0);

  if (code >= 48 && code <= 57) {
    return code - 48;
  }

  if (code >= 97 && code <= 122) {
    return code - 87;
  }

  return undefined;
}

export type ColorFormatResult = {
  hex: string;
  rgbCss: string;
  hslCss: string;
};

function getRgbChannels(hex: string) {
  return [1, 3, 5].map((offset) =>
    Number.parseInt(hex.slice(offset, offset + 2), 16),
  );
}

/** Converts a HEX color into reusable HEX, rgb(), and hsl() notations. */
export function getColorFormats(value: string): ColorFormatResult | undefined {
  const hex = normalizeHexColor(value);

  if (!hex) {
    return undefined;
  }

  const [red = 0, green = 0, blue = 0] = getRgbChannels(hex);
  const [hue, saturation, lightness] = rgbToHsl(red, green, blue);

  return {
    hex,
    rgbCss: `rgb(${red}, ${green}, ${blue})`,
    hslCss: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
  };
}

function rgbToHsl(red: number, green: number, blue: number) {
  const normalizedRed = red / 255;
  const normalizedGreen = green / 255;
  const normalizedBlue = blue / 255;
  const maximum = Math.max(normalizedRed, normalizedGreen, normalizedBlue);
  const minimum = Math.min(normalizedRed, normalizedGreen, normalizedBlue);
  const delta = maximum - minimum;
  const lightness = (maximum + minimum) / 2;

  let hue = 0;

  if (delta !== 0) {
    if (maximum === normalizedRed) {
      hue = ((normalizedGreen - normalizedBlue) / delta) % 6;
    } else if (maximum === normalizedGreen) {
      hue = (normalizedBlue - normalizedRed) / delta + 2;
    } else {
      hue = (normalizedRed - normalizedGreen) / delta + 4;
    }

    hue = Math.round(hue * 60);

    if (hue < 0) {
      hue += 360;
    }
  }

  const saturation =
    delta === 0
      ? 0
      : Math.round((delta / (1 - Math.abs(2 * lightness - 1))) * 100);

  return [hue, saturation, Math.round(lightness * 100)] as const;
}

const CYRILLIC_TRANSLIT: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  і: 'i',
  ї: 'yi',
  є: 'e',
  ґ: 'g',
};

const SLUG_SEPARATOR_PATTERN = /[^a-z0-9]+/g;
const MAX_SLUG_LENGTH = 128;

/** Builds a lowercase URL slug: Cyrillic letters are transliterated, Latin
 * diacritics are folded, and non-alphanumeric runs collapse into `separator`. */
export function createSlug(value: string, separator: '-' | '_' = '-'): string {
  const transliterated = [...value.trim().toLowerCase()]
    .map((character) => CYRILLIC_TRANSLIT[character] ?? character)
    .join('');
  const slug = transliterated
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(SLUG_SEPARATOR_PATTERN, separator)
    .slice(0, MAX_SLUG_LENGTH);
  const escapedSeparator = separator === '_' ? '_' : '-';
  const trimPattern = new RegExp(
    `^[${escapedSeparator}]+|[${escapedSeparator}]+$`,
    'g',
  );

  return slug.replace(trimPattern, '');
}

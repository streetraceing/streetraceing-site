export type UnicodeInspection = {
  codePoints: number;
  utf16Units: number;
  // UTF-8 byte length with U+FFFD replacement for each lone surrogate.
  utf8Bytes: number;
  rows: Array<{
    character: string;
    codePoint: string;
    utf8: string;
    name: string;
  }>;
  nfc: string;
  nfd: string;
  nfkc: string;
  nfkd: string;
};

const MAX_CODE_POINTS = 2_000;
const C0_NAMES = [
  'NULL',
  'START OF HEADING',
  'START OF TEXT',
  'END OF TEXT',
  'END OF TRANSMISSION',
  'ENQUIRY',
  'ACKNOWLEDGE',
  'BELL',
  'BACKSPACE',
  'TAB',
  'LINE FEED',
  'VERTICAL TAB',
  'FORM FEED',
  'CARRIAGE RETURN',
  'SHIFT OUT',
  'SHIFT IN',
  'DATA LINK ESCAPE',
  'DEVICE CONTROL ONE',
  'DEVICE CONTROL TWO',
  'DEVICE CONTROL THREE',
  'DEVICE CONTROL FOUR',
  'NEGATIVE ACKNOWLEDGE',
  'SYNCHRONOUS IDLE',
  'END OF TRANSMISSION BLOCK',
  'CANCEL',
  'END OF MEDIUM',
  'SUBSTITUTE',
  'ESCAPE',
  'FILE SEPARATOR',
  'GROUP SEPARATOR',
  'RECORD SEPARATOR',
  'UNIT SEPARATOR',
];
const C1_NAMES = [
  'PADDING CHARACTER',
  'HIGH OCTET PRESET',
  'BREAK PERMITTED HERE',
  'NO BREAK HERE',
  'INDEX',
  'NEXT LINE',
  'START OF SELECTED AREA',
  'END OF SELECTED AREA',
  'CHARACTER TABULATION SET',
  'CHARACTER TABULATION WITH JUSTIFICATION',
  'LINE TABULATION SET',
  'PARTIAL LINE FORWARD',
  'PARTIAL LINE BACKWARD',
  'REVERSE LINE FEED',
  'SINGLE SHIFT TWO',
  'SINGLE SHIFT THREE',
  'DEVICE CONTROL STRING',
  'PRIVATE USE ONE',
  'PRIVATE USE TWO',
  'SET TRANSMIT STATE',
  'CANCEL CHARACTER',
  'MESSAGE WAITING',
  'START OF GUARDED AREA',
  'END OF GUARDED AREA',
  'START OF STRING',
  'SINGLE GRAPHIC CHARACTER INTRODUCER',
  'SINGLE CHARACTER INTRODUCER',
  'CONTROL SEQUENCE INTRODUCER',
  'STRING TERMINATOR',
  'OPERATING SYSTEM COMMAND',
  'PRIVACY MESSAGE',
  'APPLICATION PROGRAM COMMAND',
];
const SPECIAL_NAMES: Readonly<Record<number, string>> = {
  0x0020: 'SPACE',
  0x007f: 'DELETE',
  0x00a0: 'NO-BREAK SPACE',
  0x00ad: 'SOFT HYPHEN',
  0x034f: 'COMBINING GRAPHEME JOINER',
  0x061c: 'ARABIC LETTER MARK',
  0x115f: 'HANGUL CHOSEONG FILLER',
  0x1160: 'HANGUL JUNGSEONG FILLER',
  0x1680: 'OGHAM SPACE MARK',
  0x17b4: 'KHMER VOWEL INHERENT AQ',
  0x17b5: 'KHMER VOWEL INHERENT AA',
  0x180b: 'MONGOLIAN FREE VARIATION SELECTOR ONE',
  0x180c: 'MONGOLIAN FREE VARIATION SELECTOR TWO',
  0x180d: 'MONGOLIAN FREE VARIATION SELECTOR THREE',
  0x180e: 'MONGOLIAN VOWEL SEPARATOR',
  0x180f: 'MONGOLIAN FREE VARIATION SELECTOR FOUR',
  0x2000: 'EN QUAD',
  0x2001: 'EM QUAD',
  0x2002: 'EN SPACE',
  0x2003: 'EM SPACE',
  0x2004: 'THREE-PER-EM SPACE',
  0x2005: 'FOUR-PER-EM SPACE',
  0x2006: 'SIX-PER-EM SPACE',
  0x2007: 'FIGURE SPACE',
  0x2008: 'PUNCTUATION SPACE',
  0x2009: 'THIN SPACE',
  0x200a: 'HAIR SPACE',
  0x200b: 'ZERO WIDTH SPACE',
  0x200c: 'ZERO WIDTH NON-JOINER',
  0x200d: 'ZERO WIDTH JOINER',
  0x200e: 'LEFT-TO-RIGHT MARK',
  0x200f: 'RIGHT-TO-LEFT MARK',
  0x2028: 'LINE SEPARATOR',
  0x2029: 'PARAGRAPH SEPARATOR',
  0x202a: 'LEFT-TO-RIGHT EMBEDDING',
  0x202b: 'RIGHT-TO-LEFT EMBEDDING',
  0x202c: 'POP DIRECTIONAL FORMATTING',
  0x202d: 'LEFT-TO-RIGHT OVERRIDE',
  0x202e: 'RIGHT-TO-LEFT OVERRIDE',
  0x202f: 'NARROW NO-BREAK SPACE',
  0x205f: 'MEDIUM MATHEMATICAL SPACE',
  0x2060: 'WORD JOINER',
  0x2061: 'FUNCTION APPLICATION',
  0x2062: 'INVISIBLE TIMES',
  0x2063: 'INVISIBLE SEPARATOR',
  0x2064: 'INVISIBLE PLUS',
  0x2066: 'LEFT-TO-RIGHT ISOLATE',
  0x2067: 'RIGHT-TO-LEFT ISOLATE',
  0x2068: 'FIRST STRONG ISOLATE',
  0x2069: 'POP DIRECTIONAL ISOLATE',
  0x206a: 'INHIBIT SYMMETRIC SWAPPING',
  0x206b: 'ACTIVATE SYMMETRIC SWAPPING',
  0x206c: 'INHIBIT ARABIC FORM SHAPING',
  0x206d: 'ACTIVATE ARABIC FORM SHAPING',
  0x206e: 'NATIONAL DIGIT SHAPES',
  0x206f: 'NOMINAL DIGIT SHAPES',
  0x2800: 'BRAILLE PATTERN BLANK',
  0x3000: 'IDEOGRAPHIC SPACE',
  0x3164: 'HANGUL FILLER',
  0xfeff: 'ZERO WIDTH NO-BREAK SPACE / BOM',
  0xffa0: 'HALFWIDTH HANGUL FILLER',
  0xfff9: 'INTERLINEAR ANNOTATION ANCHOR',
  0xfffa: 'INTERLINEAR ANNOTATION SEPARATOR',
  0xfffb: 'INTERLINEAR ANNOTATION TERMINATOR',
  0xe0001: 'LANGUAGE TAG',
  0xe007f: 'CANCEL TAG',
};

function invisibleName(point: number, character: string): string | undefined {
  if (point < 0x20) return C0_NAMES[point];
  if (point >= 0x80 && point <= 0x9f) return C1_NAMES[point - 0x80];
  if (point >= 0xd800 && point <= 0xdbff) return 'LONE HIGH SURROGATE';
  if (point >= 0xdc00 && point <= 0xdfff) return 'LONE LOW SURROGATE';
  if (point >= 0xfe00 && point <= 0xfe0f)
    return `VARIATION SELECTOR-${point - 0xfe00 + 1}`;
  if (point >= 0xe0100 && point <= 0xe01ef)
    return `VARIATION SELECTOR-${point - 0xe0100 + 17}`;
  if (SPECIAL_NAMES[point]) return SPECIAL_NAMES[point];
  if (/\p{Cf}/u.test(character))
    return `FORMAT CONTROL U+${point.toString(16).toUpperCase().padStart(4, '0')}`;
  return undefined;
}

function encodeUtf8(point: number): number[] {
  if (point <= 0x7f) return [point];
  if (point <= 0x7ff) return [0xc0 | (point >> 6), 0x80 | (point & 0x3f)];
  if (point <= 0xffff) {
    return [
      0xe0 | (point >> 12),
      0x80 | ((point >> 6) & 0x3f),
      0x80 | (point & 0x3f),
    ];
  }
  return [
    0xf0 | (point >> 18),
    0x80 | ((point >> 12) & 0x3f),
    0x80 | ((point >> 6) & 0x3f),
    0x80 | (point & 0x3f),
  ];
}

export function inspectUnicode(source: string): UnicodeInspection {
  if (source.length > MAX_CODE_POINTS * 2) throw new RangeError('limit');
  const rows: UnicodeInspection['rows'] = [];
  let utf8Bytes = 0;
  for (const character of source) {
    if (rows.length >= MAX_CODE_POINTS) throw new RangeError('limit');
    const point = character.codePointAt(0) as number;
    const loneSurrogate = point >= 0xd800 && point <= 0xdfff;
    const label = invisibleName(point, character);
    const bytes = encodeUtf8(loneSurrogate ? 0xfffd : point);
    const hex = bytes
      .map((byte) => byte.toString(16).toUpperCase().padStart(2, '0'))
      .join(' ');
    utf8Bytes += bytes.length;
    rows.push({
      character: label ?? character,
      codePoint: `U+${point.toString(16).toUpperCase().padStart(4, '0')}`,
      utf8: loneSurrogate ? `INVALID UTF-16; REPLACEMENT ${hex}` : hex,
      // This is a semantic label, not a bundled Unicode character-name database.
      name: label ?? 'VISIBLE CHARACTER',
    });
  }
  return {
    codePoints: rows.length,
    utf16Units: source.length,
    utf8Bytes,
    rows,
    nfc: source.normalize('NFC'),
    nfd: source.normalize('NFD'),
    nfkc: source.normalize('NFKC'),
    nfkd: source.normalize('NFKD'),
  };
}

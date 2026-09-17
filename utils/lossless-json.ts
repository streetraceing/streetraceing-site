export const MAX_JSON_INPUT_LENGTH = 1_000_000;
export const MAX_JSON_DEPTH = 100;
const MAX_JSON_OUTPUT_LENGTH = 4_000_000;

// Copy lexical tokens directly: parsing into JS values would lose numbers and members.
export function formatLosslessJson(source: string, indent = 2): string {
  if (source.length > MAX_JSON_INPUT_LENGTH) {
    throw new RangeError('JSON input limit exceeded.');
  }
  if (!Number.isInteger(indent) || indent < 0 || indent > 10) {
    throw new RangeError('Invalid JSON indentation.');
  }

  let position = 0;
  let outputLength = 0;
  const output: string[] = [];
  const number = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;

  function invalid(): never {
    throw new SyntaxError(`Invalid JSON at offset ${position}.`);
  }

  function write(value: string) {
    outputLength += value.length;
    if (outputLength > MAX_JSON_OUTPUT_LENGTH) {
      throw new RangeError('JSON output limit exceeded.');
    }
    output.push(value);
  }

  function whitespace() {
    while (' \t\r\n'.includes(source[position] ?? '\0')) position += 1;
  }

  function newline(depth: number) {
    if (indent) write(`\n${' '.repeat(depth * indent)}`);
  }

  function string() {
    const start = position;
    if (source[position++] !== '"') invalid();
    while (position < source.length) {
      const character = source[position++];
      if (character === '"') {
        write(source.slice(start, position));
        return;
      }
      if (character === '\\') {
        const escape = source[position++];
        if (escape === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(source.slice(position, position + 4))) {
            invalid();
          }
          position += 4;
        } else if (!escape || !'"\\/bfnrt'.includes(escape)) {
          invalid();
        }
      } else if (character === undefined || character.charCodeAt(0) < 0x20) {
        invalid();
      }
    }
    invalid();
  }

  function value(depth: number) {
    whitespace();
    const character = source[position];
    if (character === '"') {
      string();
    } else if (character === '{' || character === '[') {
      if (depth >= MAX_JSON_DEPTH)
        throw new RangeError('JSON depth limit exceeded.');
      const object = character === '{';
      const close = object ? '}' : ']';
      write(character);
      position += 1;
      whitespace();
      if (source[position] !== close) {
        newline(depth + 1);
        while (true) {
          if (object) {
            string();
            whitespace();
            if (source[position++] !== ':') invalid();
            write(indent ? ': ' : ':');
          }
          value(depth + 1);
          whitespace();
          if (source[position] !== ',') break;
          position += 1;
          write(',');
          newline(depth + 1);
          whitespace();
        }
        newline(depth);
      }
      if (source[position++] !== close) invalid();
      write(close);
    } else {
      const literal = ['true', 'false', 'null'].find((token) =>
        source.startsWith(token, position),
      );
      number.lastIndex = position;
      const token = literal ?? number.exec(source)?.[0];
      if (!token) invalid();
      write(token);
      position += token.length;
    }
  }

  value(0);
  whitespace();
  if (position !== source.length) invalid();
  return output.join('');
}

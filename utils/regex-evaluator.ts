export const REGEX_LIMITS = {
  pattern: 2_000,
  source: 50_000,
  matches: 200,
  output: 100_000,
  timeout: 1_000,
} as const;

export type RegexRequest = { pattern: string; flags: string; source: string };
export type RegexFailure = 'invalid' | 'invalidFlags' | 'inputLimit';
export type RegexResult =
  | { ok: true; output: string; count: number; limited: boolean }
  | { ok: false; error: RegexFailure };

export function validateRegexRequest({
  pattern,
  flags,
  source,
}: RegexRequest): RegexFailure | undefined {
  if (
    pattern.length > REGEX_LIMITS.pattern ||
    source.length > REGEX_LIMITS.source
  ) {
    return 'inputLimit';
  }
  if (
    flags.length > 8 ||
    /[^dgimsuvy]/.test(flags) ||
    new Set(flags).size !== flags.length ||
    (flags.includes('u') && flags.includes('v'))
  )
    return 'invalidFlags';
  return undefined;
}

export function advanceRegexIndex(
  source: string,
  index: number,
  unicode: boolean,
) {
  const point = source.codePointAt(index);
  return index + (unicode && point !== undefined && point > 0xffff ? 2 : 1);
}

// Only call inside the worker (or focused unit tests): exec itself cannot be interrupted.
export function evaluateRegex(request: RegexRequest): RegexResult {
  const error = validateRegexRequest(request);
  if (error) return { ok: false, error };
  try {
    const expression = new RegExp(request.pattern, request.flags);
    const repeat = expression.global || expression.sticky;
    const unicode = request.flags.includes('u') || request.flags.includes('v');
    let output = '';
    let count = 0;
    let limited = false;

    function append(text: string) {
      const remaining = REGEX_LIMITS.output - output.length;
      if (text.length > remaining) limited = true;
      output += text.slice(0, remaining);
    }

    // Check caps before exec, not after executing a potentially expensive extra match.
    while (
      count < REGEX_LIMITS.matches &&
      output.length < REGEX_LIMITS.output
    ) {
      const match = expression.exec(request.source);
      if (!match) break;
      count += 1;
      if (count > 1) append('\n\n');
      append(`#${count} [${match.index}..${match.index + match[0].length}] `);
      append(match[0]);
      for (let index = 1; index < match.length && !limited; index += 1) {
        if (match[index] !== undefined) {
          append(`\n  $${index}: `);
          append(match[index]);
        }
      }
      for (const [name, value] of Object.entries(match.groups ?? {})) {
        if (limited) break;
        append(`\n  ${name}: `);
        append(value ?? '');
      }
      if (!repeat) break;
      if (
        count === REGEX_LIMITS.matches ||
        output.length === REGEX_LIMITS.output
      ) {
        limited = true;
      }
      if (match[0] === '') {
        expression.lastIndex = advanceRegexIndex(
          request.source,
          expression.lastIndex,
          unicode,
        );
      }
    }
    return { ok: true, output, count, limited };
  } catch {
    return { ok: false, error: 'invalid' };
  }
}

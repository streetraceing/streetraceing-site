export type TimestampMode = 'seconds' | 'milliseconds' | 'iso';

export function parseTimestampValue(
  value: string,
  mode: TimestampMode,
): Date | undefined {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 100) return undefined;
  let date: Date;

  if (mode === 'seconds' || mode === 'milliseconds') {
    if (!/^[+-]?\d+(?:\.\d+)?$/.test(trimmed)) return undefined;
    const numeric = Number(trimmed);
    date = new Date(mode === 'seconds' ? numeric * 1000 : numeric);
  } else if (mode === 'iso') {
    // Dates alone are UTC. Date-times must specify Z or a numeric offset.
    const match =
      /^([+-]\d{6}|\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2}))?$/.exec(
        trimmed,
      );
    if (!match || match[1] === '-000000') return undefined;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month < 1 || month > 12 || day < 1 || day > (days[month - 1] ?? 0)) {
      return undefined;
    }
    if (
      match[4] !== undefined &&
      (Number(match[4]) > 23 || Number(match[5]) > 59 || Number(match[6]) > 59)
    )
      return undefined;
    const zone = match[8];
    if (
      zone &&
      zone !== 'Z' &&
      (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4)) > 59)
    )
      return undefined;
    date = new Date(trimmed);
  } else {
    return undefined;
  }

  return Number.isFinite(date.getTime()) ? date : undefined;
}

export type Season = 'none' | 'halloween' | 'new-year' | 'easter';

const DAY_IN_MS = 86_400_000;

/** Computes the UTC date of Easter Sunday for a Gregorian year with the
 * Anonymous Gregorian algorithm (Meeus/Jones/Butcher). */
export function getEasterDate(year: number): Date {
  if (!Number.isInteger(year) || year < 1583 || year > 5999) {
    throw new RangeError('year must be an integer between 1583 and 5999.');
  }

  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(Date.UTC(year, month - 1, day));
}

/** Maps a date to the active seasonal theme: Halloween week (Oct 24-31),
 * New Year holidays (Dec 20 - Jan 6), and the Easter week
 * (Easter Sunday -7..+1 days). */
export function getSeason(date: Date): Season {
  const month = date.getUTCMonth() + 1;
  const dayOfMonth = date.getUTCDate();

  if (month === 10 && dayOfMonth >= 24) {
    return 'halloween';
  }

  if ((month === 12 && dayOfMonth >= 20) || (month === 1 && dayOfMonth <= 6)) {
    return 'new-year';
  }

  const easterTime = getEasterDate(date.getUTCFullYear()).getTime();
  const time = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );

  if (time >= easterTime - 7 * DAY_IN_MS && time <= easterTime + DAY_IN_MS) {
    return 'easter';
  }

  return 'none';
}

const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();

function getDateTimeFormatter(locale: string, timeZone?: string) {
  const key = `${locale}:${timeZone ?? 'local'}`;
  const cached = dateTimeFormatters.get(key);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...(timeZone ? { timeZone } : {}),
  });
  dateTimeFormatters.set(key, formatter);
  return formatter;
}

export function formatDateTime(
  value: string | Date,
  locale: string,
  timeZone?: string,
) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '';
  }

  return getDateTimeFormatter(locale, timeZone).format(date);
}

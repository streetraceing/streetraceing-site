export function normalizeInternalAnchorHref(href: string) {
  const normalized = href.trim();

  return normalized.startsWith('#') ? `/${normalized}` : normalized;
}

export function isExternalHttpHref(href: string) {
  return href.startsWith('https://') || href.startsWith('http://');
}

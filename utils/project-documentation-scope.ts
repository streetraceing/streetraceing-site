const RAW_GITHUB_HOSTNAME = 'raw.githubusercontent.com';

function normalizeDocumentationUrl(value: string, baseUrl?: string) {
  const url = new URL(value, baseUrl);

  if (url.protocol !== 'https:' || url.username || url.password) {
    return undefined;
  }

  const path = url.pathname.split('/').filter(Boolean);
  if (
    path.some((part) => {
      const decoded = decodeURIComponent(part);
      return decoded === '.' || decoded === '..' || /[/\\%]/.test(decoded);
    })
  ) {
    return undefined;
  }

  if (
    url.hostname === 'github.com' &&
    url.port === '' &&
    path[2] === 'blob' &&
    path.length >= 5
  ) {
    url.hostname = RAW_GITHUB_HOSTNAME;
    url.pathname = `/${path[0]}/${path[1]}/refs/heads/${path.slice(3).join('/')}`;
  }

  if (!url.pathname.toLowerCase().endsWith('.md')) {
    return undefined;
  }

  url.search = '';
  return url;
}

function getScopePath(root: URL) {
  if (root.hostname !== RAW_GITHUB_HOSTNAME) {
    return root.pathname.slice(0, root.pathname.lastIndexOf('/') + 1);
  }

  const path = root.pathname.split('/').filter(Boolean);
  const referenceEnd =
    path[2] === 'refs' && (path[3] === 'heads' || path[3] === 'tags') ? 5 : 3;
  return path.length > referenceEnd
    ? `/${path.slice(0, referenceEnd).join('/')}/`
    : undefined;
}

// Navigation eligibility only; the API must continue validating every fetch.
export function resolveScopedDocumentationUrl(
  rootValue: string,
  targetValue: string,
) {
  try {
    const root = normalizeDocumentationUrl(rootValue);
    if (!root) {
      return undefined;
    }

    const target = normalizeDocumentationUrl(targetValue, root.toString());
    const scope = getScopePath(root);
    return target &&
      scope &&
      target.origin === root.origin &&
      target.pathname.startsWith(scope)
      ? target.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

export function isDocumentationLinkInScope(
  rootValue: string,
  targetValue: string,
) {
  return resolveScopedDocumentationUrl(rootValue, targetValue) !== undefined;
}

export function getDocumentationPath(rootValue: string, targetValue: string) {
  const scoped = resolveScopedDocumentationUrl(rootValue, targetValue);
  if (!scoped) {
    return undefined;
  }

  const root = normalizeDocumentationUrl(rootValue);
  const scope = root && getScopePath(root);
  return scope ? new URL(scoped).pathname.slice(scope.length) : undefined;
}

export function resolveDocumentationPath(rootValue: string, path: string) {
  // Query values are scope-relative paths, never URLs, queries or fragments.
  if (
    !path ||
    /[:\\?#]/.test(path) ||
    path.split('/').some((part) => !part || part === '.' || part === '..')
  ) {
    return undefined;
  }

  try {
    const root = normalizeDocumentationUrl(rootValue);
    const scope = root && getScopePath(root);
    return root && scope
      ? resolveScopedDocumentationUrl(
          rootValue,
          new URL(`${scope}${path}`, root).toString(),
        )
      : undefined;
  } catch {
    return undefined;
  }
}

export function getDocumentationFragment(hash: string, headingPrefix: string) {
  const renderedPrefix = `#${headingPrefix}-`;
  return hash.startsWith(renderedPrefix)
    ? `#${hash.slice(renderedPrefix.length)}`
    : hash;
}

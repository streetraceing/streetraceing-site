export type ProjectDocumentation = {
  content: string;
  sourceUrl: string;
};

const MAX_DOCUMENTATION_LENGTH = 250_000;
const DOCUMENTATION_REVALIDATE_SECONDS = 60 * 60;
const RAW_GITHUB_HOSTNAME = 'raw.githubusercontent.com';

function normalizeGitHubMarkdownUrl(url: URL) {
  if (url.hostname !== 'github.com') {
    return url;
  }

  const path = url.pathname.split('/').filter(Boolean);
  const [owner, repository, action, reference, ...documentPath] = path;

  if (
    !owner ||
    !repository ||
    action !== 'blob' ||
    !reference ||
    documentPath.length === 0
  ) {
    return url;
  }

  return new URL(
    `https://${RAW_GITHUB_HOSTNAME}/${owner}/${repository}/refs/heads/${reference}/${documentPath.join('/')}`,
  );
}

function getDocumentationUrl(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    const url = normalizeGitHubMarkdownUrl(new URL(value));

    if (
      url.protocol !== 'https:' ||
      !url.pathname.toLocaleLowerCase().endsWith('.md')
    ) {
      return undefined;
    }

    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';

    return url;
  } catch {
    return undefined;
  }
}

function getRawGitHubScope(url: URL) {
  const path = url.pathname.split('/').filter(Boolean);

  if (path.length < 4) {
    return undefined;
  }

  if (
    path[2] === 'refs' &&
    (path[3] === 'heads' || path[3] === 'tags') &&
    path[4]
  ) {
    return path.slice(0, 5).join('/');
  }

  return path.slice(0, 3).join('/');
}

export function resolveProjectDocumentationUrl(
  rootValue: string | undefined,
  requestedValue?: string,
) {
  const rootUrl = getDocumentationUrl(rootValue);

  if (!rootUrl) {
    return undefined;
  }

  let requestedUrl: URL;

  try {
    requestedUrl = normalizeGitHubMarkdownUrl(
      new URL(requestedValue || rootUrl.toString(), rootUrl),
    );
  } catch {
    return undefined;
  }

  const targetUrl = getDocumentationUrl(requestedUrl.toString());

  if (!targetUrl) {
    return undefined;
  }

  if (rootUrl.hostname === RAW_GITHUB_HOSTNAME) {
    const rootScope = getRawGitHubScope(rootUrl);
    const targetScope = getRawGitHubScope(targetUrl);

    if (
      targetUrl.hostname !== RAW_GITHUB_HOSTNAME ||
      !rootScope ||
      targetScope !== rootScope
    ) {
      return undefined;
    }
  } else {
    const rootDirectory = rootUrl.pathname.slice(
      0,
      rootUrl.pathname.lastIndexOf('/') + 1,
    );

    if (
      targetUrl.origin !== rootUrl.origin ||
      !targetUrl.pathname.startsWith(rootDirectory)
    ) {
      return undefined;
    }
  }

  return targetUrl.toString();
}

export async function readProjectDocumentation(
  value: string | undefined,
): Promise<ProjectDocumentation | undefined> {
  const sourceUrl = getDocumentationUrl(value);

  if (!sourceUrl) {
    return undefined;
  }

  try {
    const response = await fetch(sourceUrl, {
      headers: { Accept: 'text/markdown, text/plain;q=0.9' },
      next: { revalidate: DOCUMENTATION_REVALIDATE_SECONDS },
      redirect: 'error',
      signal: AbortSignal.timeout(4_500),
    });
    const contentLength = Number(response.headers.get('content-length') ?? 0);

    if (
      !response.ok ||
      (Number.isFinite(contentLength) &&
        contentLength > MAX_DOCUMENTATION_LENGTH)
    ) {
      return undefined;
    }

    const content = await response.text();

    if (!content.trim() || content.length > MAX_DOCUMENTATION_LENGTH) {
      return undefined;
    }

    return { content, sourceUrl: sourceUrl.toString() };
  } catch {
    return undefined;
  }
}

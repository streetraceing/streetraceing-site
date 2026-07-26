export type ProjectDocumentation = {
  content: string;
  sourceUrl: string;
};

const MAX_DOCUMENTATION_LENGTH = 250_000;
const DOCUMENTATION_REVALIDATE_SECONDS = 60 * 60;

function getDocumentationUrl(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);

    return url.protocol === 'https:' ? url : undefined;
  } catch {
    return undefined;
  }
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

export type ProjectDocumentation = {
  content: string;
  sourceUrl: string;
};

export type ProjectDocumentationBreadcrumb = {
  label: string;
  targetUrl?: string;
};

const RAW_GITHUB_HOSTNAME = 'raw.githubusercontent.com';

function decodePathPart(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function createDocumentationReadmeUrl(url: URL, path: string[]) {
  const targetUrl = new URL(url);

  targetUrl.pathname = `/${[...path, 'README.md'].join('/')}`;
  targetUrl.search = '';
  targetUrl.hash = '';

  return targetUrl.toString();
}

function createRepositoryBreadcrumbs(
  url: URL,
  repositoryPath: string[],
  repositoryLabel: string,
  documentPath: string[],
): ProjectDocumentationBreadcrumb[] {
  const breadcrumbs: ProjectDocumentationBreadcrumb[] = [
    {
      label: decodePathPart(repositoryLabel),
      targetUrl: createDocumentationReadmeUrl(url, repositoryPath),
    },
  ];
  const currentDirectory: string[] = [];

  for (const part of documentPath.slice(0, -1)) {
    currentDirectory.push(part);
    breadcrumbs.push({
      label: decodePathPart(part),
      targetUrl: createDocumentationReadmeUrl(url, [
        ...repositoryPath,
        ...currentDirectory,
      ]),
    });
  }

  const fileName = documentPath.at(-1);

  if (fileName) {
    breadcrumbs.push({ label: decodePathPart(fileName) });
  }

  return breadcrumbs;
}

export function getProjectDocumentationBreadcrumbs(
  sourceUrl: string,
): ProjectDocumentationBreadcrumb[] {
  try {
    const url = new URL(sourceUrl);
    const path = url.pathname.split('/').filter(Boolean);

    if (url.hostname === RAW_GITHUB_HOSTNAME && path[0] && path[1]) {
      const referenceEnd =
        path[2] === 'refs' &&
        (path[3] === 'heads' || path[3] === 'tags') &&
        path[4]
          ? 5
          : 3;
      const repositoryPath = path.slice(0, referenceEnd);
      const documentPath = path.slice(referenceEnd);

      return createRepositoryBreadcrumbs(
        url,
        repositoryPath,
        path[1],
        documentPath,
      );
    }

    if (url.hostname.endsWith('.github.io') && path[0]) {
      return createRepositoryBreadcrumbs(
        url,
        [path[0]],
        path[0],
        path.slice(1),
      );
    }

    if (path[0]) {
      return createRepositoryBreadcrumbs(
        url,
        [path[0]],
        path[0],
        path.slice(1),
      );
    }

    return [{ label: url.hostname }];
  } catch {
    return [{ label: sourceUrl }];
  }
}

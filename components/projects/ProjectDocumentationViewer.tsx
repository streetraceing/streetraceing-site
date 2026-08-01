'use client';

import { Alert, Breadcrumbs, Typography } from '@heroui/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useLocale } from '@/app/providers';
import { MarkdownContent } from '@/components/stats/MarkdownContent';
import type { ProjectDocumentation } from '@/lib/project-documentation';
import {
  createMarkdownHeadingId,
  extractMarkdownHeadings,
} from '@/utils/markdown';

const HEADING_ID_PREFIX = 'project-documentation';

type DocumentationResponse = {
  documentation?: ProjectDocumentation;
  error?: string;
};

function decodePathPart(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getDocumentationPath(sourceUrl: string) {
  try {
    const url = new URL(sourceUrl);
    const path = url.pathname.split('/').filter(Boolean).map(decodePathPart);

    if (url.hostname === 'raw.githubusercontent.com' && path[0] && path[1]) {
      const documentPath =
        path[2] === 'refs' &&
        (path[3] === 'heads' || path[3] === 'tags') &&
        path[4]
          ? path.slice(5)
          : path.slice(3);

      return [path[1], ...documentPath].filter(Boolean);
    }

    if (url.hostname.endsWith('.github.io') && path.length > 0) {
      return path;
    }

    return path.length > 0 ? path : [url.hostname];
  } catch {
    return [sourceUrl];
  }
}

function getLocationWithoutHash() {
  return `${window.location.pathname}${window.location.search}`;
}

export function ProjectDocumentationViewer({
  projectSlug,
  initialDocumentation,
}: {
  projectSlug: string;
  initialDocumentation: ProjectDocumentation;
}) {
  const { copy } = useLocale();
  const strings = copy.project;
  const viewerRef = useRef<HTMLDivElement>(null);
  const activeRequestRef = useRef<AbortController | null>(null);
  const [documentHistory, setDocumentHistory] = useState([
    initialDocumentation,
  ]);
  const [pendingFragment, setPendingFragment] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const documentation = documentHistory.at(-1) ?? initialDocumentation;
  const documentPath = useMemo(
    () => getDocumentationPath(documentation.sourceUrl),
    [documentation.sourceUrl],
  );
  const headings = useMemo(
    () => extractMarkdownHeadings(documentation.content),
    [documentation.content],
  );
  const isInitialDocument =
    documentation.sourceUrl === initialDocumentation.sourceUrl;

  useEffect(
    () => () => {
      activeRequestRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (pendingFragment === null) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      if (pendingFragment) {
        const targetId = createMarkdownHeadingId(
          HEADING_ID_PREFIX,
          pendingFragment,
        );
        const target = document.getElementById(targetId);

        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          window.history.replaceState(null, '', `#${targetId}`);
        }
      } else {
        viewerRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        window.history.replaceState(null, '', getLocationWithoutHash());
      }

      setPendingFragment(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [documentation.sourceUrl, pendingFragment]);

  async function openDocumentation(targetValue: string) {
    let targetUrl: URL;

    try {
      targetUrl = new URL(targetValue, documentation.sourceUrl);
    } catch {
      setLoadError(strings.documentationLoadFailed);
      return;
    }

    const fragment = targetUrl.hash;
    targetUrl.hash = '';

    if (targetUrl.toString() === documentation.sourceUrl) {
      activeRequestRef.current?.abort();
      activeRequestRef.current = null;
      setIsLoading(false);
      setPendingFragment(fragment);
      return;
    }

    const existingIndex = documentHistory.findIndex(
      (item) => item.sourceUrl === targetUrl.toString(),
    );

    if (existingIndex >= 0) {
      activeRequestRef.current?.abort();
      activeRequestRef.current = null;
      setDocumentHistory((currentHistory) =>
        currentHistory.slice(0, existingIndex + 1),
      );
      setLoadError(undefined);
      setIsLoading(false);
      setPendingFragment(fragment);
      return;
    }

    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    setIsLoading(true);
    setLoadError(undefined);

    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectSlug)}/documentation?url=${encodeURIComponent(targetUrl.toString())}`,
        { cache: 'no-store', signal: controller.signal },
      );
      const body = (await response.json()) as DocumentationResponse;
      const nextDocumentation = body.documentation;

      if (!response.ok || !nextDocumentation) {
        throw new Error(body.error ?? strings.documentationLoadFailed);
      }

      setDocumentHistory((currentHistory) => {
        const loadedIndex = currentHistory.findIndex(
          (item) => item.sourceUrl === nextDocumentation.sourceUrl,
        );

        return loadedIndex >= 0
          ? currentHistory.slice(0, loadedIndex + 1)
          : [...currentHistory, nextDocumentation];
      });
      setPendingFragment(fragment);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      setLoadError(
        error instanceof Error
          ? error.message
          : strings.documentationLoadFailed,
      );
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
        setIsLoading(false);
      }
    }
  }

  return (
    <div
      ref={viewerRef}
      className="flex scroll-mt-24 flex-col gap-5"
      aria-busy={isLoading}
    >
      <div className="flex flex-col gap-3 rounded-xl border bg-default-soft/40 p-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Typography.Paragraph size="sm" className="font-medium">
            {strings.documentationPath}
          </Typography.Paragraph>
          <div className="max-w-full overflow-x-auto pb-1">
            <Breadcrumbs aria-label={strings.documentationPath}>
              {documentPath.map((part, index) => {
                const canOpenRoot = index === 0 && !isInitialDocument;

                return (
                  <Breadcrumbs.Item
                    key={`${part}-${index}`}
                    href={
                      canOpenRoot ? initialDocumentation.sourceUrl : undefined
                    }
                    onClick={
                      canOpenRoot
                        ? (event) => {
                            event.preventDefault();
                            void openDocumentation(
                              initialDocumentation.sourceUrl,
                            );
                          }
                        : undefined
                    }
                  >
                    {part}
                  </Breadcrumbs.Item>
                );
              })}
            </Breadcrumbs>
          </div>
        </div>

        {headings.length > 0 ? (
          <nav
            aria-label={strings.documentationSections}
            className="flex max-w-full items-center gap-2 overflow-x-auto pb-1"
          >
            {headings.map((heading) => (
              <a
                key={heading.slug}
                href={`#${createMarkdownHeadingId(HEADING_ID_PREFIX, heading.slug)}`}
                className="shrink-0 rounded-full border bg-background px-2.5 py-1 text-xs no-underline transition-colors hover:bg-default-soft"
              >
                {heading.depth > 2 ? '↳ ' : ''}
                {heading.text}
              </a>
            ))}
          </nav>
        ) : null}

        {isLoading ? (
          <Typography.Paragraph size="sm" className="text-muted">
            {strings.documentationLoading}
          </Typography.Paragraph>
        ) : null}
      </div>

      {loadError ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{strings.documentationLoadFailed}</Alert.Title>
            <Alert.Description>{loadError}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <MarkdownContent
        content={documentation.content}
        baseUrl={documentation.sourceUrl}
        headingIdPrefix={HEADING_ID_PREFIX}
        onDocumentNavigate={(url) => void openDocumentation(url)}
      />
    </div>
  );
}

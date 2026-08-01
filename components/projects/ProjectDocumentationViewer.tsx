'use client';

import { Alert, Breadcrumbs, Typography } from '@heroui/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useLocale } from '@/app/providers';
import { MarkdownContent } from '@/components/stats/MarkdownContent';
import {
  getProjectDocumentationBreadcrumbs,
  type ProjectDocumentation,
} from '@/lib/project-documentation';
import { createMarkdownHeadingId } from '@/utils/markdown';

const HEADING_ID_PREFIX = 'project-documentation';
const DOCUMENTATION_HISTORY_KEY = 'streetraceingDocumentation';

type DocumentationResponse = {
  documentation?: ProjectDocumentation;
  error?: string;
};

type DocumentationHistoryEntry = {
  projectSlug: string;
  sourceUrl: string;
  fragment: string;
};

type HistoryMode = 'push' | 'replace' | 'none';

function getLocationWithoutHash() {
  return `${window.location.pathname}${window.location.search}`;
}

function getHistoryEntry(state: unknown, projectSlug: string) {
  if (!state || typeof state !== 'object') {
    return undefined;
  }

  const candidate = (state as Record<string, unknown>)[
    DOCUMENTATION_HISTORY_KEY
  ];

  if (!candidate || typeof candidate !== 'object') {
    return undefined;
  }

  const entry = candidate as Partial<DocumentationHistoryEntry>;

  if (
    entry.projectSlug !== projectSlug ||
    typeof entry.sourceUrl !== 'string' ||
    typeof entry.fragment !== 'string'
  ) {
    return undefined;
  }

  return entry as DocumentationHistoryEntry;
}

function isSameHistoryEntry(
  firstEntry: DocumentationHistoryEntry | undefined,
  secondEntry: DocumentationHistoryEntry,
) {
  return (
    firstEntry !== undefined &&
    firstEntry.projectSlug === secondEntry.projectSlug &&
    firstEntry.sourceUrl === secondEntry.sourceUrl &&
    firstEntry.fragment === secondEntry.fragment
  );
}

function writeHistoryEntry(
  mode: Exclude<HistoryMode, 'none'>,
  entry: DocumentationHistoryEntry,
) {
  const currentState =
    window.history.state && typeof window.history.state === 'object'
      ? (window.history.state as Record<string, unknown>)
      : {};
  const renderedHash = entry.fragment
    ? `#${createMarkdownHeadingId(HEADING_ID_PREFIX, entry.fragment)}`
    : '';
  const nextUrl = `${getLocationWithoutHash()}${renderedHash}`;

  if (
    mode === 'push' &&
    isSameHistoryEntry(
      getHistoryEntry(window.history.state, entry.projectSlug),
      entry,
    )
  ) {
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (currentUrl !== nextUrl) {
      window.history.replaceState(currentState, '', nextUrl);
    }

    return;
  }

  const nextState = {
    ...currentState,
    [DOCUMENTATION_HISTORY_KEY]: entry,
  };

  if (mode === 'push') {
    window.history.pushState(nextState, '', nextUrl);
  } else {
    window.history.replaceState(nextState, '', nextUrl);
  }
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
  const documentCacheRef = useRef(
    new Map([[initialDocumentation.sourceUrl, initialDocumentation]]),
  );
  const [documentation, setDocumentation] = useState(initialDocumentation);
  const documentationRef = useRef(documentation);
  const [pendingFragment, setPendingFragment] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const breadcrumbs = useMemo(
    () => getProjectDocumentationBreadcrumbs(documentation.sourceUrl),
    [documentation.sourceUrl],
  );

  useEffect(() => {
    documentationRef.current = documentation;
  }, [documentation]);

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
        }
      } else {
        viewerRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }

      setPendingFragment(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [documentation.sourceUrl, pendingFragment]);

  const openDocumentation = useCallback(
    async (targetValue: string, historyMode: HistoryMode = 'push') => {
      let targetUrl: URL;

      try {
        targetUrl = new URL(targetValue, documentationRef.current.sourceUrl);
      } catch {
        setLoadError(strings.documentationLoadFailed);
        return;
      }

      const fragment = targetUrl.hash;
      targetUrl.hash = '';
      const sourceUrl = targetUrl.toString();
      const historyEntry = { projectSlug, sourceUrl, fragment };

      if (sourceUrl === documentationRef.current.sourceUrl) {
        activeRequestRef.current?.abort();
        activeRequestRef.current = null;
        setIsLoading(false);
        setLoadError(undefined);
        setPendingFragment(fragment);

        if (historyMode !== 'none') {
          writeHistoryEntry(historyMode, historyEntry);
        }

        return;
      }

      const cachedDocumentation = documentCacheRef.current.get(sourceUrl);

      if (cachedDocumentation) {
        activeRequestRef.current?.abort();
        activeRequestRef.current = null;
        setDocumentation(cachedDocumentation);
        setLoadError(undefined);
        setIsLoading(false);
        setPendingFragment(fragment);

        if (historyMode !== 'none') {
          writeHistoryEntry(historyMode, historyEntry);
        }

        return;
      }

      activeRequestRef.current?.abort();
      const controller = new AbortController();
      activeRequestRef.current = controller;
      setIsLoading(true);
      setLoadError(undefined);

      try {
        const response = await fetch(
          `/api/projects/${encodeURIComponent(projectSlug)}/documentation?url=${encodeURIComponent(sourceUrl)}`,
          { cache: 'no-store', signal: controller.signal },
        );
        const body = (await response.json()) as DocumentationResponse;
        const nextDocumentation = body.documentation;

        if (!response.ok || !nextDocumentation) {
          throw new Error(body.error ?? strings.documentationLoadFailed);
        }

        documentCacheRef.current.set(
          nextDocumentation.sourceUrl,
          nextDocumentation,
        );
        setDocumentation(nextDocumentation);
        setPendingFragment(fragment);

        if (historyMode !== 'none') {
          writeHistoryEntry(historyMode, {
            projectSlug,
            sourceUrl: nextDocumentation.sourceUrl,
            fragment,
          });
        }
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
    },
    [projectSlug, strings.documentationLoadFailed],
  );

  useEffect(() => {
    let isActive = true;
    const currentEntry = getHistoryEntry(window.history.state, projectSlug);

    if (!currentEntry) {
      writeHistoryEntry('replace', {
        projectSlug,
        sourceUrl: initialDocumentation.sourceUrl,
        fragment: '',
      });
    } else if (
      currentEntry.sourceUrl !== documentationRef.current.sourceUrl ||
      currentEntry.fragment
    ) {
      window.queueMicrotask(() => {
        if (!isActive) {
          return;
        }

        void openDocumentation(
          `${currentEntry.sourceUrl}${currentEntry.fragment}`,
          'none',
        );
      });
    }

    function handlePopState(event: PopStateEvent) {
      const entry = getHistoryEntry(event.state, projectSlug);

      if (!entry) {
        return;
      }

      void openDocumentation(`${entry.sourceUrl}${entry.fragment}`, 'none');
    }

    window.addEventListener('popstate', handlePopState);
    return () => {
      isActive = false;
      window.removeEventListener('popstate', handlePopState);
    };
  }, [initialDocumentation.sourceUrl, openDocumentation, projectSlug]);

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
              {breadcrumbs.map((breadcrumb, index) => {
                const key = `${breadcrumb.label}-${index}`;
                const targetUrl = breadcrumb.targetUrl;

                if (!targetUrl) {
                  return (
                    <Breadcrumbs.Item key={key}>
                      {breadcrumb.label}
                    </Breadcrumbs.Item>
                  );
                }

                return (
                  <Breadcrumbs.Item
                    key={key}
                    href={targetUrl}
                    onClick={(event) => {
                      event.preventDefault();
                      void openDocumentation(targetUrl);
                    }}
                  >
                    {breadcrumb.label}
                  </Breadcrumbs.Item>
                );
              })}
            </Breadcrumbs>
          </div>
        </div>

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

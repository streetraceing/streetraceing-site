'use client';

import { Alert, Breadcrumbs, Typography } from '@heroui/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useLocale } from '@/app/providers';
import { MarkdownContent } from '@/components/stats/MarkdownContent';
import {
  getProjectDocumentationBreadcrumbs,
  type ProjectDocumentation,
} from '@/lib/project-documentation';
import { createMarkdownHeadingId } from '@/utils/markdown';

const HEADING_ID_PREFIX = 'project-documentation';

type DocumentationResponse = {
  documentation?: ProjectDocumentation;
  error?: string;
};

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
  const breadcrumbs = useMemo(
    () => getProjectDocumentationBreadcrumbs(documentation.sourceUrl),
    [documentation.sourceUrl],
  );

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

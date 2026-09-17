'use client';

import HighlightedMarkdownContent from './HighlightedMarkdownContent';

export function MarkdownContent({
  content,
  baseUrl,
  documentationRootUrl,
  headingIdPrefix,
  onDocumentNavigate,
}: {
  content: string;
  baseUrl?: string;
  documentationRootUrl?: string;
  headingIdPrefix?: string;
  onDocumentNavigate?: (url: string) => void;
}) {
  return (
    <HighlightedMarkdownContent
      content={content}
      baseUrl={baseUrl}
      documentationRootUrl={documentationRootUrl}
      headingIdPrefix={headingIdPrefix}
      onDocumentNavigate={onDocumentNavigate}
    />
  );
}

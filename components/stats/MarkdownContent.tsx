'use client';

import HighlightedMarkdownContent from './HighlightedMarkdownContent';

export function MarkdownContent({
  content,
  baseUrl,
  headingIdPrefix,
  onDocumentNavigate,
}: {
  content: string;
  baseUrl?: string;
  headingIdPrefix?: string;
  onDocumentNavigate?: (url: string) => void;
}) {
  return (
    <HighlightedMarkdownContent
      content={content}
      baseUrl={baseUrl}
      headingIdPrefix={headingIdPrefix}
      onDocumentNavigate={onDocumentNavigate}
    />
  );
}

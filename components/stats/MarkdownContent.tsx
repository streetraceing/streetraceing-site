'use client';

import HighlightedMarkdownContent from './HighlightedMarkdownContent';

export function MarkdownContent({
  content,
  baseUrl,
}: {
  content: string;
  baseUrl?: string;
}) {
  return <HighlightedMarkdownContent content={content} baseUrl={baseUrl} />;
}

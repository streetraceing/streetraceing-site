'use client';

import HighlightedMarkdownContent from './HighlightedMarkdownContent';

export function MarkdownContent({ content }: { content: string }) {
  return <HighlightedMarkdownContent content={content} />;
}

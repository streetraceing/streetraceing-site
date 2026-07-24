'use client';

import { Spinner, Typography } from '@heroui/react';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';

const HighlightedMarkdownContent = dynamic(
  () => import('./HighlightedMarkdownContent'),
  {
    loading: () => (
      <div className="flex justify-center py-3">
        <Spinner size="sm" />
      </div>
    ),
  },
);

const CODE_FENCE_PATTERN = /(^|\n)\s*(```|~~~)/;

export function MarkdownContent({ content }: { content: string }) {
  if (CODE_FENCE_PATTERN.test(content)) {
    return <HighlightedMarkdownContent content={content} />;
  }

  return (
    <Typography.Prose className="max-w-none wrap-break-word text-sm leading-6 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-l-2 [&_blockquote]:border-accent/60 [&_blockquote]:pl-3 [&_blockquote]:text-muted [&_code:not(.hljs)]:rounded-md [&_code:not(.hljs)]:bg-default-soft [&_code:not(.hljs)]:px-1.5 [&_code:not(.hljs)]:py-0.5 [&_code:not(.hljs)]:text-[0.8125rem] [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:my-3 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre_code]:min-w-max [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown
        components={{
          a: ({ href, children }) => {
            const isExternal =
              href?.startsWith('https://') || href?.startsWith('http://');

            return (
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noreferrer' : undefined}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </Typography.Prose>
  );
}

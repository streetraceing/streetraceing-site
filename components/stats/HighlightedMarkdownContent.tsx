'use client';
/* eslint-disable @next/next/no-img-element -- Documentation images are remote Markdown content and cannot use a fixed Next.js image allowlist. */

import { Typography } from '@heroui/react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';

import { isExternalHttpHref, normalizeInternalAnchorHref } from '@/utils/links';
import { remarkTextDecorations } from '@/utils/markdown';
import Link from 'next/link';

export default function HighlightedMarkdownContent({
  content,
  baseUrl,
}: {
  content: string;
  baseUrl?: string;
}) {
  function resolveRemoteUrl(value: string) {
    if (!baseUrl) {
      return value;
    }

    try {
      const resolved = new URL(value, baseUrl);

      return resolved.protocol === 'http:' || resolved.protocol === 'https:'
        ? resolved.toString()
        : value;
    } catch {
      return value;
    }
  }

  return (
    <Typography.Prose className="max-w-none wrap-break-word text-sm leading-6 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-l-2 [&_blockquote]:border-accent/60 [&_blockquote]:pl-3 [&_blockquote]:text-muted [&_code:not(.hljs)]:rounded-md [&_code:not(.hljs)]:bg-default-soft [&_code:not(.hljs)]:px-1.5 [&_code:not(.hljs)]:py-0.5 [&_code:not(.hljs)]:text-[0.8125rem] [&_del]:text-muted [&_del]:decoration-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:my-3 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre_code]:min-w-max [&_u]:decoration-2 [&_u]:underline-offset-4 [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown
        remarkPlugins={[remarkTextDecorations]}
        rehypePlugins={[[rehypeHighlight, { detect: true }]]}
        components={{
          a: ({ href = '', children }) => {
            const normalizedHref = normalizeInternalAnchorHref(
              resolveRemoteUrl(href),
            );
            const isExternal = isExternalHttpHref(normalizedHref);

            return (
              <Link
                href={normalizedHref}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noreferrer' : undefined}
              >
                {children}
              </Link>
            );
          },
          img: ({ src = '', alt = '' }) => (
            <img
              src={resolveRemoteUrl(src)}
              alt={alt}
              loading="lazy"
              decoding="async"
              className="my-4 h-auto max-w-full rounded-lg border bg-default-soft"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </Typography.Prose>
  );
}

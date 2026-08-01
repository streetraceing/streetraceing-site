'use client';
/* eslint-disable @next/next/no-img-element -- Documentation images are remote Markdown content and cannot use a fixed Next.js image allowlist. */

import { Typography } from '@heroui/react';
import Link from 'next/link';
import type { MouseEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';

import { isExternalHttpHref, normalizeInternalAnchorHref } from '@/utils/links';
import {
  createMarkdownHeadingId,
  isMarkdownDocumentHref,
  remarkGfmTables,
  remarkHeadingIds,
  remarkTextDecorations,
} from '@/utils/markdown';

function getTableTextAlign(align: string | undefined) {
  switch (align) {
    case 'left':
    case 'center':
    case 'right':
    case 'justify':
      return align;
    default:
      return undefined;
  }
}

function isPlainPrimaryClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.button === 0 &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  );
}

export default function HighlightedMarkdownContent({
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
  function resolveRemoteUrl(value: string | Blob) {
    if (typeof value !== 'string') {
      return '';
    }

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
    <Typography.Prose className="max-w-none wrap-break-word text-sm leading-6 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-l-2 [&_blockquote]:border-accent/60 [&_blockquote]:pl-3 [&_blockquote]:text-muted [&_code:not(.hljs)]:rounded-md [&_code:not(.hljs)]:bg-default-soft [&_code:not(.hljs)]:px-1.5 [&_code:not(.hljs)]:py-0.5 [&_code:not(.hljs)]:text-[0.8125rem] [&_del]:text-muted [&_del]:decoration-2 [&_h1]:scroll-mt-24 [&_h2]:scroll-mt-24 [&_h3]:scroll-mt-24 [&_h4]:scroll-mt-24 [&_h5]:scroll-mt-24 [&_h6]:scroll-mt-24 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:my-3 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre_code]:min-w-max [&_u]:decoration-2 [&_u]:underline-offset-4 [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown
        remarkPlugins={[
          remarkGfmTables,
          remarkTextDecorations,
          [remarkHeadingIds, { prefix: headingIdPrefix }],
        ]}
        rehypePlugins={[[rehypeHighlight, { detect: true }]]}
        components={{
          a: ({ href = '', children }) => {
            if (headingIdPrefix && href.trim().startsWith('#')) {
              return (
                <a href={`#${createMarkdownHeadingId(headingIdPrefix, href)}`}>
                  {children}
                </a>
              );
            }

            const resolvedHref = resolveRemoteUrl(href);

            if (
              baseUrl &&
              onDocumentNavigate &&
              isMarkdownDocumentHref(resolvedHref)
            ) {
              return (
                <a
                  href={resolvedHref}
                  onClick={(event) => {
                    if (!isPlainPrimaryClick(event)) {
                      return;
                    }

                    event.preventDefault();
                    onDocumentNavigate(resolvedHref);
                  }}
                >
                  {children}
                </a>
              );
            }

            const normalizedHref = normalizeInternalAnchorHref(resolvedHref);
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
          table: ({ children }) => (
            <div className="my-4 max-w-full overflow-x-auto rounded-lg border">
              <table className="w-full min-w-max border-collapse text-left text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-default-soft">{children}</thead>
          ),
          tr: ({ children }) => (
            <tr className="border-t first:border-t-0">{children}</tr>
          ),
          th: ({ align, children }) => (
            <th
              className="whitespace-nowrap px-3 py-2 text-left font-semibold"
              style={{ textAlign: getTableTextAlign(align) }}
            >
              {children}
            </th>
          ),
          td: ({ align, children }) => (
            <td
              className="px-3 py-2 align-top"
              style={{ textAlign: getTableTextAlign(align) }}
            >
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </Typography.Prose>
  );
}

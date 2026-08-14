'use client';

import { ButtonRipple } from '@/components/ui/Button';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

import { useLocale } from '@/app/providers';
import { normalizeInternalAnchorHref } from '@/utils/links';

export function ExternalLinkButton({ url }: { url: string }) {
  const { copy } = useLocale();

  return (
    <Link
      href={normalizeInternalAnchorHref(url)}
      prefetch={false}
      className="button button--primary button--md"
    >
      <ButtonRipple />
      <ArrowUpRight className="size-4" />
      {copy.tinyUrl.openLink}
    </Link>
  );
}

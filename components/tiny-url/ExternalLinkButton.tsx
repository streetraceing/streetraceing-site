'use client';

import { Button } from '@heroui/react';
import { ArrowUpRight } from 'lucide-react';

import { useLocale } from '@/app/providers';
import { normalizeInternalAnchorHref } from '@/utils/links';

export function ExternalLinkButton({ url }: { url: string }) {
  const { copy } = useLocale();

  return (
    <Button
      onPress={() => window.location.assign(normalizeInternalAnchorHref(url))}
    >
      <ArrowUpRight />
      {copy.tinyUrl.openLink}
    </Button>
  );
}

'use client';

import { useLocale } from '@/app/providers';
import { Button } from '@heroui/react';
import { ArrowUpRight } from 'lucide-react';

export function ExternalLinkButton({ url }: { url: string }) {
  const { copy } = useLocale();

  return (
    <Button onPress={() => window.location.assign(url)}>
      <ArrowUpRight />
      {copy.tinyUrl.openLink}
    </Button>
  );
}

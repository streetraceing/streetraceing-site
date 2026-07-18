'use client';

import { Button } from '@heroui/react';
import { ArrowUpRight } from 'lucide-react';

export function ExternalLinkButton({ url }: { url: string }) {
  return (
    <Button onPress={() => window.location.assign(url)}>
      <ArrowUpRight />
      Перейти по ссылке
    </Button>
  );
}

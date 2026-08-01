'use client';

import { useLocale } from '@/app/providers';
import { ToolPageFrame } from '@/components/tools/ToolPageFrame';
import { Link as LinkIcon } from 'lucide-react';

import { TinyUrlForm } from './TinyUrlForm';

export function TinyUrlPageContent() {
  const { copy } = useLocale();

  return (
    <ToolPageFrame
      title={copy.tinyUrl.title}
      description={copy.tinyUrl.description}
      icon={<LinkIcon className="size-6" />}
    >
      <TinyUrlForm />
    </ToolPageFrame>
  );
}

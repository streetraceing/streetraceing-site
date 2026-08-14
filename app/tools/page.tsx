import type { Metadata } from 'next';

import { ToolsPageContent } from '@/components/tools/ToolsPageContent';
import { getServerLocale } from '@/lib/server-locale';
import { translations } from '@/utils/i18n';
import { createPageMetadata } from '@/utils/seo';
import { availableTools } from '@/utils/tool-catalog';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const strings = translations[locale].toolsPage;

  return createPageMetadata({
    locale,
    title: strings.metadataTitle,
    description: strings.description,
    path: '/tools',
    keywords: [
      ...new Set(
        availableTools.flatMap((tool) => tool.tags.map((tag) => tag[locale])),
      ),
    ],
  });
}

export default function ToolsPage() {
  return <ToolsPageContent />;
}

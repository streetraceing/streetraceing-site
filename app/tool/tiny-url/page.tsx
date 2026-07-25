import type { Metadata } from 'next';

import { JsonLd } from '@/components/seo/JsonLd';
import { TinyUrlPageContent } from '@/components/tiny-url/TinyUrlPageContent';
import { getServerLocale } from '@/lib/server-locale';
import { mainPageConfig } from '@/utils/config';
import { getText } from '@/utils/i18n';
import { createPageMetadata, createToolJsonLd } from '@/utils/seo';

const tinyUrlTool = mainPageConfig.tools.find(
  (tool) => tool.slug === 'tiny-url',
);

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();

  if (!tinyUrlTool) {
    return {};
  }

  return createPageMetadata({
    locale,
    title: getText(tinyUrlTool.name, locale),
    description: getText(tinyUrlTool.description, locale),
    path: '/tool/tiny-url',
    keywords: tinyUrlTool.tags.map((tag) => getText(tag, locale)),
  });
}

export default async function TinyUrlPage() {
  const locale = await getServerLocale();

  return (
    <>
      {tinyUrlTool ? (
        <JsonLd data={createToolJsonLd(tinyUrlTool, locale)} />
      ) : null}
      <TinyUrlPageContent />
    </>
  );
}

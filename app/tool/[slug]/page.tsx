import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/seo/JsonLd';
import { ToolPageContent } from '@/components/tools/ToolPageContent';
import { getServerLocale } from '@/lib/server-locale';
import { mainPageConfig } from '@/utils/config';
import { getText } from '@/utils/i18n';
import { createPageMetadata, createToolJsonLd } from '@/utils/seo';

const genericTools = mainPageConfig.tools.filter(
  (tool) => tool.status === 'available' && tool.component,
);

type ToolPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return genericTools.map(({ slug }) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: ToolPageProps): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getServerLocale()]);
  const tool = genericTools.find((currentTool) => currentTool.slug === slug);

  if (!tool) {
    notFound();
  }

  return createPageMetadata({
    locale,
    title: getText(tool.name, locale),
    description: getText(tool.description, locale),
    path: `/tool/${tool.slug}`,
    keywords: tool.tags.map((tag) => getText(tag, locale)),
  });
}

export default async function ToolPage({ params }: ToolPageProps) {
  const [{ slug }, locale] = await Promise.all([params, getServerLocale()]);
  const tool = genericTools.find((currentTool) => currentTool.slug === slug);

  if (!tool?.component) {
    notFound();
  }

  return (
    <>
      <JsonLd data={createToolJsonLd(tool, locale)} />
      <ToolPageContent slug={slug} />
    </>
  );
}

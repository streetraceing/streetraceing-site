import { ToolPageContent } from '@/components/tools/ToolPageContent';
import { mainPageConfig } from '@/utils/config';
import { notFound } from 'next/navigation';

const toolSlugs = [
  'json-viewer',
  'uuid-generator',
  'text-tools',
  'base64',
] as const;

type ToolSlug = (typeof toolSlugs)[number];

type ToolPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return toolSlugs.map((slug) => ({ slug }));
}

export const dynamicParams = false;

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = mainPageConfig.tools.find(
    (currentTool) => currentTool.slug === slug,
  );

  if (
    !toolSlugs.includes(slug as ToolSlug) ||
    !tool ||
    tool.status !== 'available'
  ) {
    notFound();
  }

  return <ToolPageContent slug={slug as ToolSlug} />;
}

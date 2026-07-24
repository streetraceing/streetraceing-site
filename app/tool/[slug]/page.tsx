import { ToolPageContent } from '@/components/tools/ToolPageContent';
import { mainPageConfig } from '@/utils/config';
import { notFound } from 'next/navigation';

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

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = genericTools.find((currentTool) => currentTool.slug === slug);

  if (!tool?.component) {
    notFound();
  }

  return <ToolPageContent slug={slug} />;
}

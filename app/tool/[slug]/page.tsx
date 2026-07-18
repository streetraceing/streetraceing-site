import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Page } from '@/components/layout/Page';
import { Base64Tool } from '@/components/tools/Base64Tool';
import { JsonViewerTool } from '@/components/tools/JsonViewerTool';
import { TextToolsTool } from '@/components/tools/TextToolsTool';
import { UuidGeneratorTool } from '@/components/tools/UuidGeneratorTool';
import { mainPageConfig } from '@/utils/config';
import { Card, Typography } from '@heroui/react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const toolComponents = {
  'json-viewer': JsonViewerTool,
  'uuid-generator': UuidGeneratorTool,
  'text-tools': TextToolsTool,
  base64: Base64Tool,
} as const;

type ToolSlug = keyof typeof toolComponents;

type ToolPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return Object.keys(toolComponents).map((slug) => ({ slug }));
}

export const dynamicParams = false;

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const ToolComponent = toolComponents[slug as ToolSlug];
  const tool = mainPageConfig.tools.find(
    (currentTool) => currentTool.slug === slug,
  );

  if (!ToolComponent || !tool || tool.status !== 'available') {
    notFound();
  }

  return (
    <Page header={<Header />} footer={<Footer />}>
      <Container className="flex flex-col gap-4 py-4">
        <Link
          href="/#tools"
          className="button button--tertiary button--md self-start"
        >
          <ArrowLeft className="size-4" />
          Ко всем инструментам
        </Link>

        <Card className="mx-auto w-full max-w-4xl">
          <Card.Header className="gap-3">
            <div className="flex items-start gap-3">
              {tool.icon && (
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-default-soft">
                  <tool.icon className="size-6" />
                </span>
              )}
              <div className="flex min-w-0 flex-col gap-1">
                <Typography.Heading level={1}>{tool.name}</Typography.Heading>
                <Card.Description>{tool.description}</Card.Description>
              </div>
            </div>
          </Card.Header>
          <Card.Content>
            <ToolComponent />
          </Card.Content>
        </Card>
      </Container>
    </Page>
  );
}

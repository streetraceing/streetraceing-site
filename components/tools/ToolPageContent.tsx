'use client';

import { useLocale } from '@/app/providers';
import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Page } from '@/components/layout/Page';
import { mainPageConfig, type GenericToolComponent } from '@/utils/config';
import { getText } from '@/utils/i18n';
import { Card, Typography } from '@heroui/react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ComponentType } from 'react';

import { Base64Tool } from './Base64Tool';
import { JsonViewerTool } from './JsonViewerTool';
import { TextToolsTool } from './TextToolsTool';
import { UuidGeneratorTool } from './UuidGeneratorTool';

const toolComponents: Record<GenericToolComponent, ComponentType> = {
  'json-viewer': JsonViewerTool,
  'uuid-generator': UuidGeneratorTool,
  'text-tools': TextToolsTool,
  base64: Base64Tool,
};

export function ToolPageContent({ slug }: { slug: string }) {
  const { copy, locale } = useLocale();
  const tool = mainPageConfig.tools.find(
    (currentTool) => currentTool.slug === slug,
  );
  const ToolComponent = tool?.component
    ? toolComponents[tool.component]
    : undefined;

  if (!tool || !ToolComponent) {
    return null;
  }

  return (
    <Page header={<Header />} footer={<Footer />}>
      <Container className="flex flex-col gap-4 py-4">
        <Link
          href="/#tools"
          className="button button--tertiary button--md self-start"
        >
          <ArrowLeft className="size-4" />
          {copy.tool.allTools}
        </Link>

        <Card className="mx-auto w-full max-w-4xl">
          <Card.Header className="gap-3">
            <div className="flex items-start gap-3">
              {tool.icon ? (
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-default-soft">
                  <tool.icon className="size-6" />
                </span>
              ) : null}
              <div className="flex min-w-0 flex-col gap-1">
                <Typography.Heading level={1}>
                  {getText(tool.name, locale)}
                </Typography.Heading>
                <Card.Description>
                  {getText(tool.description, locale)}
                </Card.Description>
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

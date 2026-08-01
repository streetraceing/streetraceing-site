'use client';

import { useLocale } from '@/app/providers';
import { ButtonRipple } from '@/components/ui/Button';
import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Page } from '@/components/layout/Page';
import { mainPageConfig, type GenericToolComponent } from '@/utils/config';
import { getText } from '@/utils/i18n';
import { Card, Surface, Typography } from '@heroui/react';
import { ArrowLeft } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { ComponentType } from 'react';

import { toolPanelClassName, toolWorkspaceClassName } from './toolStyles';

const toolComponents: Record<GenericToolComponent, ComponentType> = {
  'json-viewer': dynamic(() =>
    import('./JsonViewerTool').then((module) => module.JsonViewerTool),
  ),
  'uuid-generator': dynamic(() =>
    import('./UuidGeneratorTool').then((module) => module.UuidGeneratorTool),
  ),
  'text-tools': dynamic(() =>
    import('./TextToolsTool').then((module) => module.TextToolsTool),
  ),
  base64: dynamic(() =>
    import('./Base64Tool').then((module) => module.Base64Tool),
  ),
  'password-generator': dynamic(() =>
    import('./SecurityTools').then((module) => module.PasswordGeneratorTool),
  ),
  'jwt-inspector': dynamic(() =>
    import('./SecurityTools').then((module) => module.JwtInspectorTool),
  ),
  'hash-generator': dynamic(() =>
    import('./SecurityTools').then((module) => module.HashGeneratorTool),
  ),
  'regex-tester': dynamic(() =>
    import('./DeveloperTools').then((module) => module.RegexTesterTool),
  ),
  'url-inspector': dynamic(() =>
    import('./DeveloperTools').then((module) => module.UrlInspectorTool),
  ),
  'json-to-typescript': dynamic(() =>
    import('./DeveloperTools').then((module) => module.JsonToTypeScriptTool),
  ),
  'text-diff': dynamic(() =>
    import('./DeveloperTools').then((module) => module.TextDiffTool),
  ),
  'timestamp-converter': dynamic(() =>
    import('./TimeDesignTools').then((module) => module.TimestampConverterTool),
  ),
  'color-contrast': dynamic(() =>
    import('./TimeDesignTools').then((module) => module.ColorContrastTool),
  ),
  'cron-builder': dynamic(() =>
    import('./TimeDesignTools').then((module) => module.CronBuilderTool),
  ),
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
          href="/tools"
          className="button button--tertiary button--md self-start"
        >
          <ButtonRipple />
          <ArrowLeft className="size-4" />
          {copy.tool.allTools}
        </Link>

        <Card
          variant="secondary"
          className={`${toolPanelClassName} mx-auto w-full max-w-4xl`}
        >
          <Card.Header className="gap-3">
            <div className="flex items-start gap-3">
              {tool.icon ? (
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-default-soft">
                  <tool.icon className="size-6" />
                </span>
              ) : null}
              <div className="flex min-w-0 flex-col gap-1">
                <Typography.Heading level={2}>
                  {getText(tool.name, locale)}
                </Typography.Heading>
                <Card.Description>
                  {getText(tool.description, locale)}
                </Card.Description>
              </div>
            </div>
          </Card.Header>
          <Card.Content>
            <Surface variant="default" className={toolWorkspaceClassName}>
              <ToolComponent />
            </Surface>
          </Card.Content>
        </Card>
      </Container>
    </Page>
  );
}

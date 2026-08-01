'use client';

import { useLocale } from '@/app/providers';
import { mainPageConfig, type GenericToolComponent } from '@/utils/config';
import { getText } from '@/utils/i18n';
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

import { ToolPageFrame } from './ToolPageFrame';

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
  const { locale } = useLocale();
  const tool = mainPageConfig.tools.find(
    (currentTool) => currentTool.slug === slug,
  );
  const ToolComponent = tool?.component
    ? toolComponents[tool.component]
    : undefined;

  if (!tool || !ToolComponent) {
    return null;
  }

  const ToolIcon = tool.icon;

  return (
    <ToolPageFrame
      title={getText(tool.name, locale)}
      description={getText(tool.description, locale)}
      icon={ToolIcon ? <ToolIcon className="size-6" /> : undefined}
    >
      <ToolComponent />
    </ToolPageFrame>
  );
}

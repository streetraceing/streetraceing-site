'use client';

import { useLocale } from '@/app/providers';
import type { GenericToolComponent } from '@/utils/config';
import { getText } from '@/utils/i18n';
import { getGenericToolBySlug } from '@/utils/tool-catalog';
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
  'hmac-generator': dynamic(() =>
    import('./HmacGeneratorTool').then((module) => module.HmacGeneratorTool),
  ),
  'regex-tester': dynamic(() =>
    import('./DeveloperTools').then((module) => module.RegexTesterTool),
  ),
  'url-inspector': dynamic(() =>
    import('./DeveloperTools').then((module) => module.UrlInspectorTool),
  ),
  'url-codec': dynamic(() =>
    import('./UrlCodecTool').then((module) => module.UrlCodecTool),
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
  'color-converter': dynamic(() =>
    import('./ColorConverterTool').then((module) => module.ColorConverterTool),
  ),
  'cron-builder': dynamic(() =>
    import('./TimeDesignTools').then((module) => module.CronBuilderTool),
  ),
  'base-converter': dynamic(() =>
    import('./BaseConverterTool').then((module) => module.BaseConverterTool),
  ),
  'slug-generator': dynamic(() =>
    import('./SlugGeneratorTool').then((module) => module.SlugGeneratorTool),
  ),
};

export function ToolPageContent({ slug }: { slug: string }) {
  const { locale } = useLocale();
  const tool = getGenericToolBySlug(slug);
  const ToolComponent = tool ? toolComponents[tool.component] : undefined;

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

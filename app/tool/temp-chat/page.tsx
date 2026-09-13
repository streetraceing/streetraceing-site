import type { Metadata } from 'next';

import { JsonLd } from '@/components/seo/JsonLd';
import { TempChatCreate } from '@/components/temp-chat/TempChatCreate';
import { getServerLocale } from '@/lib/server-locale';
import { getText } from '@/utils/i18n';
import { createPageMetadata, createToolJsonLd } from '@/utils/seo';
import { getToolBySlug } from '@/utils/tool-catalog';

const tempChatTool = getToolBySlug('temp-chat');

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();

  if (!tempChatTool) {
    return {};
  }

  return createPageMetadata({
    locale,
    title: getText(tempChatTool.name, locale),
    description: getText(tempChatTool.description, locale),
    path: '/tool/temp-chat',
    keywords: tempChatTool.tags.map((tag) => getText(tag, locale)),
  });
}

export default async function TempChatPage() {
  const locale = await getServerLocale();

  return (
    <>
      {tempChatTool ? (
        <JsonLd data={createToolJsonLd(tempChatTool, locale)} />
      ) : null}
      <TempChatCreate />
    </>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { TempChatRoom } from '@/components/temp-chat/TempChatRoom';
import { getServerLocale } from '@/lib/server-locale';
import { TEMP_CHAT_CODE_PATTERN } from '@/lib/temp-chat';
import { translations } from '@/utils/i18n';
import { createPageMetadata } from '@/utils/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const [{ id }, locale] = await Promise.all([params, getServerLocale()]);
  const strings = translations[locale].tempChat;

  return createPageMetadata({
    locale,
    title: strings.gateTitle,
    description: strings.gateDescription,
    path: `/tools/chat/${id}`,
    noIndex: true,
  });
}

export default async function TempChatRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!TEMP_CHAT_CODE_PATTERN.test(id)) {
    notFound();
  }

  return <TempChatRoom code={id} />;
}

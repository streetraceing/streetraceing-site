import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { and, eq, gt, sql } from 'drizzle-orm';

import { SharedDataContent } from '@/components/tiny-url/SharedDataContent';
import { db } from '@/db';
import { shortUrls } from '@/db/schema';
import { CODE_PATTERN, getTinyUrlRetentionThreshold } from '@/lib/tiny-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

function getExternalUrl(content: string) {
  try {
    const url = new URL(content.trim());
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

export default async function SharedDataPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  if (!CODE_PATTERN.test(code) || !process.env.DATABASE_URL) {
    notFound();
  }

  const [item] = await db
    .select({ content: shortUrls.content })
    .from(shortUrls)
    .where(
      and(
        eq(shortUrls.code, code),
        gt(shortUrls.createdAt, getTinyUrlRetentionThreshold()),
      ),
    )
    .limit(1);

  if (!item) {
    notFound();
  }

  await db
    .update(shortUrls)
    .set({ visitCount: sql`${shortUrls.visitCount} + 1` })
    .where(eq(shortUrls.code, code));

  const externalUrl = getExternalUrl(item.content);

  return <SharedDataContent content={item.content} externalUrl={externalUrl} />;
}

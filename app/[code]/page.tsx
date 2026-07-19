import { SharedDataContent } from '@/components/tiny-url/SharedDataContent';
import { db } from '@/db';
import { shortUrls } from '@/db/schema';
import { CODE_PATTERN } from '@/lib/tiny-url';
import { eq, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    .where(eq(shortUrls.code, code))
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

import { db } from '@/db';
import { shortUrls } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CODE_PATTERN = /^[A-Za-z0-9_-]{8}$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  if (!CODE_PATTERN.test(code) || !process.env.DATABASE_URL) {
    notFound();
  }

  const [shortUrl] = await db
    .select({ destinationUrl: shortUrls.destinationUrl })
    .from(shortUrls)
    .where(eq(shortUrls.code, code))
    .limit(1);

  if (!shortUrl) {
    notFound();
  }

  await db
    .update(shortUrls)
    .set({ visitCount: sql`${shortUrls.visitCount} + 1` })
    .where(and(eq(shortUrls.code, code)));

  redirect(shortUrl.destinationUrl);
}

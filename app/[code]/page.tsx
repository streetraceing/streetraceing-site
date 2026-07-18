import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Page } from '@/components/layout/Page';
import { ExternalLinkButton } from '@/components/tiny-url/ExternalLinkButton';
import { db } from '@/db';
import { shortUrls } from '@/db/schema';
import { CODE_PATTERN } from '@/lib/tiny-url';
import { Card } from '@heroui/react';
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

  return (
    <Page header={<Header />} footer={<Footer />}>
      <Container className="flex items-center py-12 sm:py-20">
        <Card className="mx-auto w-full max-w-3xl">
          <Card.Header>
            <Card.Title>
              {externalUrl ? 'Ссылка' : 'Сохранённые данные'}
            </Card.Title>
            <Card.Description>
              {externalUrl
                ? 'Перейди по адресу, который сохранён за этим коротким кодом.'
                : 'Эта ссылка открывает сохранённые данные без перенаправления.'}
            </Card.Description>
          </Card.Header>
          <Card.Content>
            {externalUrl ? (
              <div className="rounded-xl bg-default p-4 break-all text-sm text-muted">
                {externalUrl}
              </div>
            ) : (
              <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-default p-4 font-mono text-sm leading-6">
                {item.content}
              </pre>
            )}
          </Card.Content>
          {externalUrl ? (
            <Card.Footer>
              <ExternalLinkButton url={externalUrl} />
            </Card.Footer>
          ) : null}
        </Card>
      </Container>
    </Page>
  );
}

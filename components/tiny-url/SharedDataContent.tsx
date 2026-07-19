'use client';

import { useLocale } from '@/app/providers';
import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Page } from '@/components/layout/Page';
import { Card } from '@heroui/react';

import { ExternalLinkButton } from './ExternalLinkButton';

type SharedDataContentProps = {
  content: string;
  externalUrl?: string;
};

export function SharedDataContent({
  content,
  externalUrl,
}: SharedDataContentProps) {
  const { copy } = useLocale();

  return (
    <Page header={<Header />} footer={<Footer />}>
      <Container className="flex items-center py-12 sm:py-20">
        <Card className="mx-auto w-full max-w-3xl">
          <Card.Header>
            <Card.Title>
              {externalUrl
                ? copy.tinyUrl.sharedLinkTitle
                : copy.tinyUrl.sharedDataTitle}
            </Card.Title>
            <Card.Description>
              {externalUrl
                ? copy.tinyUrl.sharedLinkDescription
                : copy.tinyUrl.sharedDataDescription}
            </Card.Description>
          </Card.Header>
          <Card.Content>
            {externalUrl ? (
              <div className="break-all rounded-xl bg-default p-4 text-sm text-muted">
                {externalUrl}
              </div>
            ) : (
              <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-default p-4 font-mono text-sm leading-6">
                {content}
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

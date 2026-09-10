'use client';

import { useLocale } from '@/app/providers';
import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Page } from '@/components/layout/Page';
import { Card, Typography } from '@heroui/react';

import { ToolOutput } from '@/components/tools/ToolOutput';

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
        <Card className="mx-auto w-full max-w-3xl dark:bg-default/20">
          <Card.Header className="gap-2">
            <Typography.Heading level={1}>
              {externalUrl
                ? copy.tinyUrl.sharedLinkTitle
                : copy.tinyUrl.sharedDataTitle}
            </Typography.Heading>
            <Card.Description>
              {externalUrl
                ? copy.tinyUrl.sharedLinkDescription
                : copy.tinyUrl.sharedDataDescription}
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <ToolOutput
              content={externalUrl ?? content}
              format={externalUrl ? 'url' : 'plain'}
            />
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

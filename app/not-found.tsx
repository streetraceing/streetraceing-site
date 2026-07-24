'use client';

import { useLocale } from '@/app/providers';
import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Page } from '@/components/layout/Page';
import { Separator, Typography } from '@heroui/react';

export default function NotFound() {
  const { copy } = useLocale();

  return (
    <Page header={<Header />} footer={<Footer />}>
      <Container className="flex items-center justify-center">
        <div className="flex items-center gap-4">
          <Typography.Heading level={1}>404</Typography.Heading>
          <Separator orientation="vertical" />
          <Typography.Paragraph>{copy.notFound}</Typography.Paragraph>
        </div>
      </Container>
    </Page>
  );
}

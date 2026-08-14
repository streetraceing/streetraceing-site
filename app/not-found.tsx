'use client';

import { useLocale } from '@/app/providers';
import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Page } from '@/components/layout/Page';
import { ButtonRipple } from '@/components/ui/Button';
import { Card, Typography } from '@heroui/react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  const { copy } = useLocale();

  return (
    <Page header={<Header />} footer={<Footer />}>
      <Container className="flex items-center justify-center py-12 sm:py-20">
        <Card className="relative w-full max-w-xl overflow-hidden text-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-24 mx-auto size-64 rounded-full bg-accent/10 blur-3xl"
          />
          <Card.Content className="relative items-center gap-5 py-10 sm:py-14">
            <span
              aria-hidden="true"
              className="text-7xl font-semibold tracking-tighter text-muted/30 sm:text-8xl"
            >
              404
            </span>
            <div className="flex max-w-md flex-col gap-2">
              <Typography.Heading level={1}>{copy.notFound}</Typography.Heading>
              <Typography.Paragraph className="text-muted">
                {copy.notFoundDescription}
              </Typography.Paragraph>
            </div>
            <Link href="/" className="button button--primary button--md">
              <ButtonRipple />
              <ArrowLeft className="size-4" />
              {copy.backHome}
            </Link>
          </Card.Content>
        </Card>
      </Container>
    </Page>
  );
}

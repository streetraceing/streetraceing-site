'use client';

import { useLocale } from '@/app/providers';
import { ButtonRipple } from '@/components/ui/Button';
import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Page } from '@/components/layout/Page';
import { Card } from '@heroui/react';
import { ArrowLeft, Link as LinkIcon } from 'lucide-react';
import NextLink from 'next/link';

import { TinyUrlForm } from './TinyUrlForm';

export function TinyUrlPageContent() {
  const { copy } = useLocale();

  return (
    <Page header={<Header />} footer={<Footer />}>
      <Container className="flex flex-col gap-6 py-12 sm:py-20">
        <NextLink
          href="/#tools"
          className="button button--tertiary button--md self-start"
        >
          <ButtonRipple />
          <ArrowLeft className="size-4" />
          {copy.tool.allTools}
        </NextLink>

        <Card className="mx-auto w-full max-w-2xl">
          <Card.Header className="items-center text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <LinkIcon className="size-6" />
            </div>
            <Card.Title>{copy.tinyUrl.title}</Card.Title>
            <Card.Description className="max-w-lg">
              {copy.tinyUrl.description}
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <TinyUrlForm />
          </Card.Content>
        </Card>
      </Container>
    </Page>
  );
}

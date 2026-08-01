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
import type { ReactNode } from 'react';

type ToolPageFrameProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  children: ReactNode;
};

export function ToolPageFrame({
  title,
  description,
  icon,
  children,
}: ToolPageFrameProps) {
  const { copy } = useLocale();

  return (
    <Page header={<Header />} footer={<Footer />}>
      <Container className="flex flex-col gap-4 py-4 sm:py-6">
        <Link
          href="/tools"
          className="button button--tertiary button--md self-start"
        >
          <ButtonRipple />
          <ArrowLeft className="size-4" />
          {copy.tool.allTools}
        </Link>

        <Card className="mx-auto w-full max-w-4xl">
          <Card.Header className="gap-3">
            <div className="flex items-start gap-3">
              {icon ? (
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-surface-secondary">
                  {icon}
                </span>
              ) : null}
              <div className="flex min-w-0 flex-col">
                <Typography.Heading level={3}>{title}</Typography.Heading>
                <Card.Description>{description}</Card.Description>
              </div>
            </div>
          </Card.Header>
          <Card.Content>{children}</Card.Content>
        </Card>
      </Container>
    </Page>
  );
}

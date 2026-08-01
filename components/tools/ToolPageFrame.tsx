'use client';

import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Page } from '@/components/layout/Page';
import { ButtonRipple } from '@/components/ui/Button';
import { useLocale } from '@/app/providers';
import { Card, Surface, Typography } from '@heroui/react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { toolShellClassName, toolWorkspaceClassName } from './toolStyles';

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

        <Card
          variant="secondary"
          className={`${toolShellClassName} mx-auto w-full max-w-4xl`}
        >
          <Card.Header className="gap-3 pb-2 sm:px-7 sm:pt-7">
            <div className="flex items-start gap-3">
              {icon ? (
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent shadow-sm">
                  {icon}
                </span>
              ) : null}
              <div className="flex min-w-0 flex-col gap-1">
                <Typography.Heading level={2}>{title}</Typography.Heading>
                <Card.Description>{description}</Card.Description>
              </div>
            </div>
          </Card.Header>
          <Card.Content className="sm:px-7 sm:pb-7">
            <Surface variant="default" className={toolWorkspaceClassName}>
              {children}
            </Surface>
          </Card.Content>
        </Card>
      </Container>
    </Page>
  );
}

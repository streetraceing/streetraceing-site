'use client';

import { useLocale } from '@/app/providers';
import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Page } from '@/components/layout/Page';
import { mainPageConfig } from '@/utils/config';
import { Typography } from '@heroui/react';

import { ToolsDirectory } from './ToolsDirectory';

export function ToolsPageContent() {
  const { copy } = useLocale();
  const strings = copy.toolsPage;

  return (
    <Page header={<Header />} footer={<Footer />}>
      <Container className="flex flex-col gap-6 py-6 sm:py-10">
        <header className="flex max-w-3xl flex-col gap-2">
          <Typography.Heading level={2}>
            {strings.title.replace(
              '{count}',
              String(mainPageConfig.tools.length),
            )}
          </Typography.Heading>
          <Typography.Paragraph className="text-muted">
            {strings.description}
          </Typography.Paragraph>
        </header>
        <ToolsDirectory />
      </Container>
    </Page>
  );
}

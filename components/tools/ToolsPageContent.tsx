'use client';

import { useLocale } from '@/app/providers';
import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Page } from '@/components/layout/Page';
import {
  availableTools,
  genericTools,
  toolCategories,
} from '@/utils/tool-catalog';
import { Card, Chip, Typography } from '@heroui/react';
import { ShieldCheck, Sparkles } from 'lucide-react';

import { ToolsDirectory } from './ToolsDirectory';

export function ToolsPageContent() {
  const { copy } = useLocale();
  const strings = copy.toolsPage;
  const statistics = [
    { value: availableTools.length, label: strings.availableStat },
    { value: genericTools.length, label: strings.localStat },
    { value: toolCategories.length, label: strings.categoriesStat },
  ];

  return (
    <Page header={<Header />} footer={<Footer />}>
      <Container className="flex flex-col gap-8 py-6 sm:py-10 lg:gap-10 lg:py-12">
        <header className="relative isolate overflow-hidden rounded-3xl border bg-surface/90 px-5 py-7 shadow-sm sm:px-8 sm:py-10 lg:px-12 lg:py-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-28 -z-10 size-80 rounded-full bg-accent/12 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-36 left-1/4 -z-10 size-72 rounded-full bg-success/10 blur-3xl"
          />

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
            <div className="flex max-w-3xl flex-col items-start gap-4">
              <Chip color="accent" size="sm" variant="soft">
                <Sparkles className="size-3.5" />
                {strings.eyebrow}
              </Chip>
              <div className="flex flex-col gap-3">
                <Typography.Heading
                  level={1}
                  className="max-w-2xl text-3xl sm:text-4xl lg:text-5xl"
                >
                  {strings.title.replace(
                    '{count}',
                    String(availableTools.length),
                  )}
                </Typography.Heading>
                <Typography.Paragraph className="max-w-2xl text-base text-muted sm:text-lg">
                  {strings.description}
                </Typography.Paragraph>
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-2 lg:grid-cols-1">
              {statistics.map((item) => (
                <div
                  key={item.label}
                  className="flex min-w-0 flex-col rounded-2xl bg-surface-secondary/85 px-3 py-3 lg:flex-row lg:items-baseline lg:justify-between lg:gap-3"
                >
                  <dt className="order-2 truncate text-xs text-muted sm:text-sm">
                    {item.label}
                  </dt>
                  <dd className="order-1 text-2xl font-semibold tracking-tight lg:order-2">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </header>

        <Card variant="secondary" className="border-0">
          <Card.Header className="flex-row items-start gap-4 sm:items-center">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface-tertiary text-success">
              <ShieldCheck className="size-5" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <Card.Title>{strings.localTitle}</Card.Title>
              <Card.Description>{strings.localDescription}</Card.Description>
            </div>
          </Card.Header>
        </Card>

        <ToolsDirectory />
      </Container>
    </Page>
  );
}

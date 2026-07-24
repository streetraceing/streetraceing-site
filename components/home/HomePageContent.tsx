'use client';

import { useLocale } from '@/app/providers';
import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { HomeScrollManager } from '@/components/layout/HomeScrollManager';
import { Page } from '@/components/layout/Page';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { StatsSection } from '@/components/stats/StatsSection';
import type { DevUpdatesFeed } from '@/components/stats/types';
import { siteConfig } from '@/utils/config';
import { Typography } from '@heroui/react';
import dynamic from 'next/dynamic';

const ProjectsSection = dynamic(() =>
  import('@/components/home/ProjectsSection').then(
    (module) => module.ProjectsSection,
  ),
);

const ToolsSection = dynamic(() =>
  import('@/components/home/ToolsSection').then(
    (module) => module.ToolsSection,
  ),
);

export function HomePageContent({
  initialFeed,
  initialFeedLoaded,
}: {
  initialFeed: DevUpdatesFeed;
  initialFeedLoaded: boolean;
}) {
  const { copy } = useLocale();

  return (
    <Page header={<Header />} footer={<Footer />}>
      <HomeScrollManager />
      <Container className="flex flex-col gap-4 py-4">
        <Typography.Heading level={1} className="sr-only">
          {siteConfig.name}
        </Typography.Heading>
        <Typography.Paragraph>{copy.home.intro}</Typography.Paragraph>

        <section
          id="bio"
          className="scroll-mt-16 flex flex-col gap-4 border-t pt-4"
        >
          <Typography.Heading level={2}>
            {copy.home.bioTitle}
          </Typography.Heading>

          <div className="flex h-fit flex-col gap-4 md:h-48 md:flex-row">
            <ProfileAvatar />
            <div className="flex flex-col gap-3">
              {copy.home.bio.map((paragraph) => (
                <Typography.Paragraph key={paragraph}>
                  {paragraph}
                </Typography.Paragraph>
              ))}
            </div>
          </div>
        </section>

        <StatsSection
          initialFeed={initialFeed}
          initialFeedLoaded={initialFeedLoaded}
        />
        <ProjectsSection />
        <ToolsSection />
      </Container>
    </Page>
  );
}

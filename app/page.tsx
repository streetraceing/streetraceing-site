'use client';

import { useLocale } from '@/app/providers';
import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Page } from '@/components/layout/Page';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ToolCard } from '@/components/projects/ToolCard';
import { StatsSection } from '@/components/stats/StatsSection';
import { mainPageConfig } from '@/utils/config';
import { Typography } from '@heroui/react';

export default function HomePage() {
  const { copy } = useLocale();

  return (
    <Page header={<Header />} footer={<Footer />}>
      <Container className="py-4 gap-4 flex flex-col">
        <Typography.Paragraph>{copy.home.intro}</Typography.Paragraph>

        <section
          id="bio"
          className="scroll-mt-16 flex flex-col gap-4 pt-4 border-t"
        >
          <Typography.Heading level={3}>
            {copy.home.bioTitle}
          </Typography.Heading>

          <div className="flex gap-4 h-fit flex-col md:flex-row md:h-48">
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

        <StatsSection />

        <section
          id="projects"
          className="scroll-mt-16 flex flex-col gap-4 pt-4 border-t"
        >
          <Typography.Heading level={3}>
            {copy.home.projectsTitle.replace(
              '{count}',
              String(mainPageConfig.projects.length),
            )}
          </Typography.Heading>

          <div className="flex flex-col gap-4">
            {mainPageConfig.projects.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
        </section>

        <section
          id="tools"
          className="scroll-mt-16 flex flex-col gap-4 pt-4 border-t"
        >
          <Typography.Heading level={3}>
            {copy.home.toolsTitle.replace(
              '{count}',
              String(mainPageConfig.tools.length),
            )}
          </Typography.Heading>

          <div className="flex flex-col gap-4">
            {mainPageConfig.tools.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </section>
      </Container>
    </Page>
  );
}

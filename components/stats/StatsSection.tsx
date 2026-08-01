'use client';

import { useLocale } from '@/app/providers';
import { GitHubCommitHistory } from '@/components/stats/GitHubCommitHistory';
import { SkillsBarChart } from '@/components/stats/SkillsBarChart';
import type { PublicGitHubCommitFeed } from '@/components/stats/types';
import { Typography } from '@heroui/react';

export function StatsSection({
  githubCommitFeed,
}: {
  githubCommitFeed: PublicGitHubCommitFeed;
}) {
  const { copy } = useLocale();
  const strings = copy.stats;

  return (
    <section
      id="stats"
      className="scroll-mt-16 flex flex-col gap-4 border-t pt-4"
    >
      <div className="flex flex-col gap-1">
        <Typography.Heading level={2}>{strings.title}</Typography.Heading>
        <Typography.Paragraph className="text-muted">
          {strings.description}
        </Typography.Paragraph>
      </div>

      <div className="flex flex-col gap-4">
        <SkillsBarChart />
        <GitHubCommitHistory feed={githubCommitFeed} />
      </div>
    </section>
  );
}

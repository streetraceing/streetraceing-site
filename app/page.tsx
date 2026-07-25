import type { Metadata } from 'next';

import { HomePageContent } from '@/components/home/HomePageContent';
import { getEmptyDevUpdatesFeed, readDevUpdatesFeed } from '@/lib/dev-updates';
import { readPublicGitHubCommits } from '@/lib/github-activity';
import { getServerLocale } from '@/lib/server-locale';
import { siteConfig } from '@/utils/site';
import { getText } from '@/utils/i18n';
import { createPageMetadata } from '@/utils/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();

  return createPageMetadata({
    locale,
    title: siteConfig.name,
    description: getText(siteConfig.description, locale),
    path: '/',
    keywords:
      locale === 'ru'
        ? [
            'проекты разработчика',
            'инструменты разработчика',
            'заметки о разработке',
          ]
        : ['developer projects', 'developer tools', 'development notes'],
  });
}

export default async function HomePage() {
  const devUpdatesPromise = process.env.DATABASE_URL
    ? readDevUpdatesFeed({ page: 1, sort: 'newest' })
        .then((feed) => ({ feed, loaded: true }))
        .catch(() => ({ feed: getEmptyDevUpdatesFeed(), loaded: false }))
    : Promise.resolve({ feed: getEmptyDevUpdatesFeed(), loaded: false });

  const [devUpdates, githubCommitFeed] = await Promise.all([
    devUpdatesPromise,
    readPublicGitHubCommits(),
  ]);

  return (
    <HomePageContent
      initialFeed={devUpdates.feed}
      initialFeedLoaded={devUpdates.loaded}
      githubCommitFeed={githubCommitFeed}
    />
  );
}

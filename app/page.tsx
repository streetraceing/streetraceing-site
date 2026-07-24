import { HomePageContent } from '@/components/home/HomePageContent';
import { getEmptyDevUpdatesFeed, readDevUpdatesFeed } from '@/lib/dev-updates';
import { readPublicGitHubCommits } from '@/lib/github-activity';

export const dynamic = 'force-dynamic';

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

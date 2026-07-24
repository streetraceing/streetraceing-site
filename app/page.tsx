import { HomePageContent } from '@/components/home/HomePageContent';
import { getEmptyDevUpdatesFeed, readDevUpdatesFeed } from '@/lib/dev-updates';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let initialFeed = getEmptyDevUpdatesFeed();
  let initialFeedLoaded = false;

  if (process.env.DATABASE_URL) {
    try {
      initialFeed = await readDevUpdatesFeed({ page: 1, sort: 'newest' });
      initialFeedLoaded = true;
    } catch {
      // The client keeps the existing retry/error UI if the database is unavailable.
    }
  }

  return (
    <HomePageContent
      initialFeed={initialFeed}
      initialFeedLoaded={initialFeedLoaded}
    />
  );
}

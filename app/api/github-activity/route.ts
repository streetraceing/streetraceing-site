import { readPublicGitHubCommits } from '@/lib/github-activity';

export const dynamic = 'force-dynamic';

export async function GET() {
  const feed = await readPublicGitHubCommits();

  return Response.json(feed, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

import { noStoreJson } from '@/lib/api-response';
import { readPublicGitHubCommits } from '@/lib/github-activity';

export const dynamic = 'force-dynamic';

export async function GET() {
  const feed = await readPublicGitHubCommits();

  return noStoreJson(feed);
}

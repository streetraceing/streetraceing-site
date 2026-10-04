import { noStoreJson } from '@/lib/api-response';
import {
  readProjectDocumentation,
  resolveProjectDocumentationUrl,
} from '@/lib/project-documentation';
import { getRequestLocale, translations } from '@/utils/i18n';
import { getProjectBySlug } from '@/utils/project-catalog';
import { checkDurableRateLimit, getClientAddress } from '@/utils/rate-limit';

export const runtime = 'nodejs';

const DOCUMENTATION_RATE_LIMIT = 60;
const DOCUMENTATION_RATE_WINDOW_MS = 10 * 60 * 1_000;

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const strings =
    translations[getRequestLocale(request)].api.projectDocumentation;
  const { slug } = await context.params;
  const project = getProjectBySlug(slug);

  if (!project?.documentationUrl) {
    return noStoreJson({ error: strings.notFound }, { status: 404 });
  }

  // Unique urls bypass the upstream fetch cache, so throttle the proxy itself.
  const rateLimit = await checkDurableRateLimit({
    key: `project-documentation:${getClientAddress(request)}`,
    limit: DOCUMENTATION_RATE_LIMIT,
    windowMs: DOCUMENTATION_RATE_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    return noStoreJson({ error: strings.loadFailed }, { status: 429 });
  }

  const requestedUrl =
    new URL(request.url).searchParams.get('url') ?? undefined;
  const sourceUrl = resolveProjectDocumentationUrl(
    project.documentationUrl,
    requestedUrl,
  );

  if (!sourceUrl) {
    return noStoreJson({ error: strings.invalid }, { status: 400 });
  }

  const documentation = await readProjectDocumentation(sourceUrl);

  if (!documentation) {
    return noStoreJson({ error: strings.loadFailed }, { status: 502 });
  }

  return noStoreJson({ documentation });
}

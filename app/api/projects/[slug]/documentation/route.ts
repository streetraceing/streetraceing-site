import { noStoreJson } from '@/lib/api-response';
import {
  readProjectDocumentation,
  resolveProjectDocumentationUrl,
} from '@/lib/project-documentation';
import { getRequestLocale, translations } from '@/utils/i18n';
import { getProjectBySlug } from '@/utils/project-catalog';

export const runtime = 'nodejs';

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

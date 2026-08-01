import { NextResponse } from 'next/server';

import {
  readProjectDocumentation,
  resolveProjectDocumentationUrl,
} from '@/lib/project-documentation';
import { mainPageConfig } from '@/utils/config';
import { getRequestLocale, translations } from '@/utils/i18n';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const strings =
    translations[getRequestLocale(request)].api.projectDocumentation;
  const { slug } = await context.params;
  const project = mainPageConfig.projects.find(
    (currentProject) => currentProject.slug === slug,
  );

  if (!project?.documentationUrl) {
    return NextResponse.json({ error: strings.notFound }, { status: 404 });
  }

  const requestedUrl =
    new URL(request.url).searchParams.get('url') ?? undefined;
  const sourceUrl = resolveProjectDocumentationUrl(
    project.documentationUrl,
    requestedUrl,
  );

  if (!sourceUrl) {
    return NextResponse.json({ error: strings.invalid }, { status: 400 });
  }

  const documentation = await readProjectDocumentation(sourceUrl);

  if (!documentation) {
    return NextResponse.json({ error: strings.loadFailed }, { status: 502 });
  }

  return NextResponse.json({ documentation });
}

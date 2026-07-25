import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/seo/JsonLd';
import { ProjectPageContent } from '@/components/projects/ProjectPageContent';
import { readProjectContent } from '@/lib/project-content';
import { getServerLocale } from '@/lib/server-locale';
import { mainPageConfig } from '@/utils/config';
import { getText } from '@/utils/i18n';
import { createPageMetadata, createProjectJsonLd } from '@/utils/seo';

type ProjectPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getServerLocale()]);
  const project = mainPageConfig.projects.find(
    (currentProject) => currentProject.slug === slug,
  );

  if (!project) {
    notFound();
  }

  return createPageMetadata({
    locale,
    title: project.name,
    description: getText(project.shortDescription, locale),
    path: `/project/${project.slug}`,
    keywords: project.technologies,
  });
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const [{ slug }, locale] = await Promise.all([params, getServerLocale()]);
  const project = mainPageConfig.projects.find(
    (currentProject) => currentProject.slug === slug,
  );

  if (!project) {
    notFound();
  }

  const content = await readProjectContent(project.slug);

  if (!content) {
    notFound();
  }

  return (
    <>
      <JsonLd data={createProjectJsonLd(project, locale)} />
      <ProjectPageContent slug={project.slug} initialContent={content} />
    </>
  );
}

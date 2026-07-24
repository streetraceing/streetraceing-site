import { ProjectPageContent } from '@/components/projects/ProjectPageContent';
import { readProjectContent } from '@/lib/project-content';
import { mainPageConfig } from '@/utils/config';
import { notFound } from 'next/navigation';

type ProjectPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
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

  return <ProjectPageContent slug={project.slug} initialContent={content} />;
}

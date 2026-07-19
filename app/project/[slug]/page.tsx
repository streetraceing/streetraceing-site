import { ProjectPageContent } from '@/components/projects/ProjectPageContent';
import { mainPageConfig } from '@/utils/config';
import { notFound } from 'next/navigation';

type ProjectPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return mainPageConfig.projects.map((project) => ({ slug: project.slug }));
}

export const dynamicParams = false;

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = mainPageConfig.projects.find(
    (currentProject) => currentProject.slug === slug,
  );

  if (!project) {
    notFound();
  }

  return <ProjectPageContent slug={project.slug} />;
}

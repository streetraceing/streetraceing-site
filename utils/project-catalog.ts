import { mainPageConfig, type ProjectConfig } from '@/utils/config';

export const projects = mainPageConfig.projects;

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug);
}

export function getProjectHref(project: Pick<ProjectConfig, 'slug'>) {
  return `/project/${project.slug}`;
}

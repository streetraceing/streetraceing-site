import {
  mainPageConfig,
  type GenericToolComponent,
  type ToolCategory,
  type ToolConfig,
} from '@/utils/config';

export const toolCategories = [
  'developer',
  'data',
  'text',
  'security',
  'time-design',
] as const satisfies readonly ToolCategory[];

export type AvailableToolConfig = ToolConfig & { status: 'available' };
export type GenericToolConfig = AvailableToolConfig & {
  component: GenericToolComponent;
};

export const availableTools = mainPageConfig.tools.filter(
  (tool): tool is AvailableToolConfig => tool.status === 'available',
);

export const genericTools = availableTools.filter(
  (tool): tool is GenericToolConfig => Boolean(tool.component),
);

export const featuredTools = availableTools.filter((tool) => tool.featured);

export function getToolBySlug(slug: string) {
  return availableTools.find((tool) => tool.slug === slug);
}

export function getGenericToolBySlug(slug: string) {
  return genericTools.find((tool) => tool.slug === slug);
}

export function getToolHref(tool: Pick<ToolConfig, 'slug'>) {
  return `/tool/${tool.slug}`;
}

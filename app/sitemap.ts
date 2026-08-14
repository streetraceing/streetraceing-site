import type { MetadataRoute } from 'next';

import { getProjectHref, projects } from '@/utils/project-catalog';
import { getAbsoluteUrl } from '@/utils/seo';
import { availableTools, getToolHref } from '@/utils/tool-catalog';

export default function sitemap(): MetadataRoute.Sitemap {
  const projectEntries = projects.map((project) => ({
    url: getAbsoluteUrl(getProjectHref(project)),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));
  const tools = availableTools.map((tool) => ({
    url: getAbsoluteUrl(getToolHref(tool)),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [
    {
      url: getAbsoluteUrl('/'),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...projectEntries,
    {
      url: getAbsoluteUrl('/tools'),
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    ...tools,
  ];
}

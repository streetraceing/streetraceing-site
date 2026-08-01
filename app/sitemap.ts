import type { MetadataRoute } from 'next';

import { mainPageConfig } from '@/utils/config';
import { getAbsoluteUrl } from '@/utils/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const projects = mainPageConfig.projects.map((project) => ({
    url: getAbsoluteUrl(`/project/${project.slug}`),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));
  const tools = mainPageConfig.tools
    .filter((tool) => tool.status === 'available')
    .map((tool) => ({
      url: getAbsoluteUrl(`/tool/${tool.slug}`),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));

  return [
    {
      url: getAbsoluteUrl('/'),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...projects,
    {
      url: getAbsoluteUrl('/tools'),
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    ...tools,
  ];
}

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'streetraceing',
    short_name: 'streetraceing',
    description: 'Personal developer portfolio, projects, notes, and tools.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#09090b',
    icons: [
      {
        src: '/images/streetraceing.jpeg',
        sizes: '1000x1000',
        type: 'image/jpeg',
        purpose: 'any',
      },
    ],
  };
}

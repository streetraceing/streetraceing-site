import type { Metadata } from 'next';

import type { ProjectConfig, ToolConfig } from '@/utils/config';
import { siteConfig } from '@/utils/site';
import { getLocaleTag, getText, type Locale } from '@/utils/i18n';

const fallbackSiteUrl = 'http://localhost:3333';
const socialImagePath = '/opengraph-image';
const githubProfileUrl = 'https://github.com/streetraceing';

const siteKeywords: Record<Locale, string[]> = {
  ru: [
    'streetraceing',
    'Андрей',
    'разработчик',
    'full-stack',
    'TypeScript',
    'React',
    'Next.js',
    'Rust',
    'Java',
    'open source',
    'портфолио',
  ],
  en: [
    'streetraceing',
    'Andrey',
    'developer',
    'full-stack',
    'TypeScript',
    'React',
    'Next.js',
    'Rust',
    'Java',
    'open source',
    'portfolio',
  ],
};

function normalizeSiteUrl(value: string) {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const url = new URL(withProtocol);

  url.pathname = '/';
  url.search = '';
  url.hash = '';

  return url;
}

export function getSiteUrl() {
  const candidates = [
    process.env.SITE_URL?.trim(),
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim(),
    process.env.VERCEL_URL?.trim(),
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      return normalizeSiteUrl(candidate);
    } catch {
      continue;
    }
  }

  return new URL(fallbackSiteUrl);
}

export function getAbsoluteUrl(path = '/') {
  return new URL(path, getSiteUrl()).toString();
}

function getOpenGraphLocale(locale: Locale) {
  return getLocaleTag(locale).replace('-', '_');
}

function getFullTitle(title?: string) {
  return title ? `${title} | ${siteConfig.name}` : siteConfig.name;
}

function getBaseMetadata(locale: Locale, description: string): Metadata {
  const googleVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const yandexVerification = process.env.YANDEX_SITE_VERIFICATION?.trim();

  return {
    metadataBase: getSiteUrl(),
    applicationName: siteConfig.name,
    description,
    authors: [{ name: 'streetraceing', url: githubProfileUrl }],
    creator: 'streetraceing',
    publisher: 'streetraceing',
    category: 'technology',
    keywords: siteKeywords[locale],
    referrer: 'origin-when-cross-origin',
    formatDetection: {
      address: false,
      email: false,
      telephone: false,
    },
    manifest: '/manifest.webmanifest',
    icons: {
      icon: '/favicon.ico',
      shortcut: '/favicon.ico',
    },
    appleWebApp: {
      capable: true,
      title: siteConfig.name,
      statusBarStyle: 'black-translucent',
    },
    ...(googleVerification || yandexVerification
      ? {
          verification: {
            ...(googleVerification ? { google: googleVerification } : {}),
            ...(yandexVerification ? { yandex: yandexVerification } : {}),
          },
        }
      : {}),
  };
}

export function createRootMetadata(locale: Locale): Metadata {
  const description = getText(siteConfig.description, locale);

  return {
    ...getBaseMetadata(locale, description),
    title: {
      default: siteConfig.name,
      template: `%s | ${siteConfig.name}`,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        maxImagePreview: 'large',
        maxSnippet: -1,
        maxVideoPreview: -1,
      },
    },
    openGraph: {
      type: 'website',
      url: '/',
      siteName: siteConfig.name,
      title: siteConfig.name,
      description,
      locale: getOpenGraphLocale(locale),
      images: [
        {
          url: socialImagePath,
          width: 1200,
          height: 630,
          alt: `${siteConfig.name} developer portfolio`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: siteConfig.name,
      description,
      images: [socialImagePath],
    },
  };
}

type PageMetadataOptions = {
  locale: Locale;
  title: string;
  description: string;
  path: string;
  keywords?: readonly string[];
  noIndex?: boolean;
};

export function createPageMetadata({
  locale,
  title,
  description,
  path,
  keywords = [],
  noIndex = false,
}: PageMetadataOptions): Metadata {
  const fullTitle = getFullTitle(title);

  return {
    title,
    description,
    keywords: [...siteKeywords[locale], ...keywords],
    alternates: {
      canonical: path,
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            maxImagePreview: 'large',
            maxSnippet: -1,
            maxVideoPreview: -1,
          },
        },
    openGraph: {
      type: 'website',
      url: path,
      siteName: siteConfig.name,
      title: fullTitle,
      description,
      locale: getOpenGraphLocale(locale),
      images: [
        {
          url: socialImagePath,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [socialImagePath],
    },
  };
}

export function createWebsiteJsonLd(locale: Locale) {
  const siteUrl = getSiteUrl().toString();
  const description = getText(siteConfig.description, locale);

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${siteUrl}#website`,
      url: siteUrl,
      name: siteConfig.name,
      description,
      inLanguage: getLocaleTag(locale),
      publisher: {
        '@id': `${siteUrl}#person`,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      '@id': `${siteUrl}#person`,
      name: 'streetraceing',
      alternateName: locale === 'ru' ? 'Андрей' : 'Andrey',
      url: siteUrl,
      image: getAbsoluteUrl('/images/streetraceing.jpeg'),
      sameAs: [
        githubProfileUrl,
        'https://t.me/streetraceing',
        'https://vk.com/streetraceing',
      ],
      knowsAbout: siteKeywords[locale],
    },
  ] as const;
}

export function createProjectJsonLd(project: ProjectConfig, locale: Locale) {
  const path = `/project/${project.slug}`;
  const sourceCodeUrl = project.links.find((link) =>
    link.url.includes('github.com'),
  )?.url;

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: project.name,
    description: getText(project.longDescription, locale),
    url: getAbsoluteUrl(path),
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    isAccessibleForFree: true,
    author: {
      '@type': 'Person',
      name: 'streetraceing',
      url: getSiteUrl().toString(),
    },
    ...(sourceCodeUrl ? { codeRepository: sourceCodeUrl } : {}),
    keywords: project.technologies.join(', '),
  };
}

export function createToolJsonLd(tool: ToolConfig, locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: getText(tool.name, locale),
    description: getText(tool.description, locale),
    url: getAbsoluteUrl(`/tool/${tool.slug}`),
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript',
    isAccessibleForFree: true,
    author: {
      '@type': 'Person',
      name: 'streetraceing',
      url: getSiteUrl().toString(),
    },
  };
}

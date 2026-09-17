import './globals.css';

import { geistMono, geistSans, petitFormal } from '@/app/fonts';
import { Providers } from '@/app/providers';
import { PrivacyAnalytics } from '@/components/PrivacyAnalytics';
import { JsonLd } from '@/components/seo/JsonLd';
import { isAdmin, isAuthConfigured } from '@/utils/auth';
import { mainPageConfig } from '@/utils/config';
import {
  getLocale,
  getLocaleFromAcceptLanguage,
  LOCALE_COOKIE,
} from '@/utils/i18n';
import { createRootMetadata, createWebsiteJsonLd } from '@/utils/seo';
import { getTheme, THEME_COOKIE, THEME_STORAGE_KEY } from '@/utils/theme';
import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';

const themeBootstrapScript = `
  (() => {
    try {
      const cookieTheme = document.cookie
        .split('; ')
        .find((value) => value.startsWith('${THEME_COOKIE}='))
        ?.split('=')[1];
      let storedTheme;
      try {
        storedTheme = window.localStorage.getItem('${THEME_STORAGE_KEY}');
      } catch {}
      const preference =
        storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system'
          ? storedTheme
          : cookieTheme === 'light' || cookieTheme === 'dark' || cookieTheme === 'system'
            ? cookieTheme
            : 'system';
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const resolvedTheme =
        preference === 'system'
          ? prefersDark
            ? 'dark'
            : 'light'
          : preference;
      const root = document.documentElement;

      root.classList.toggle('dark', resolvedTheme === 'dark');
      root.dataset.theme = resolvedTheme;
      root.dataset.themePreference = preference;
      root.style.colorScheme = resolvedTheme;
      const themeColor = resolvedTheme === 'dark' ? '#09090b' : '#ffffff';
      root.style.backgroundColor = themeColor;
      document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
        meta.content = themeColor;
        meta.removeAttribute('media');
      });
      document.cookie = '${THEME_COOKIE}=' + preference + '; path=/; max-age=31536000; samesite=lax';
    } catch {}
  })();
`;

const themePrepaintStyles = `
  html, body { background-color: #ffffff; }
  html.dark, html.dark body,
  html[data-theme='dark'], html[data-theme='dark'] body {
    background-color: #09090b;
  }
  @media (prefers-color-scheme: dark) {
    html[data-theme-preference='system'],
    html[data-theme-preference='system'] body {
      background-color: #09090b;
    }
  }
`;

const isVercelAnalyticsEnabled =
  process.env.VERCEL_ANALYTICS_ENABLED === 'true';
const speedInsightsSampleRate = Math.min(
  1,
  Math.max(
    0,
    Number.parseFloat(process.env.VERCEL_SPEED_INSIGHTS_SAMPLE_RATE ?? '0') ||
      0,
  ),
);

export async function generateViewport(): Promise<Viewport> {
  const cookieStore = await cookies();
  const theme = getTheme(cookieStore.get(THEME_COOKIE)?.value);

  return {
    width: 'device-width',
    initialScale: 1,
    colorScheme: 'light dark',
    themeColor:
      theme === 'system'
        ? [
            { media: '(prefers-color-scheme: light)', color: '#ffffff' },
            { media: '(prefers-color-scheme: dark)', color: '#09090b' },
          ]
        : theme === 'dark'
          ? '#09090b'
          : '#ffffff',
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const storedLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = storedLocale
    ? getLocale(storedLocale)
    : getLocaleFromAcceptLanguage(headerStore.get('accept-language'));

  return createRootMetadata(locale);
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [cookieStore, headerStore, authenticated] = await Promise.all([
    cookies(),
    headers(),
    isAdmin(),
  ]);
  const storedLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = storedLocale
    ? getLocale(storedLocale)
    : getLocaleFromAcceptLanguage(headerStore.get('accept-language'));
  const initialTheme = getTheme(cookieStore.get(THEME_COOKIE)?.value);
  const resolvedServerTheme =
    initialTheme === 'system' ? undefined : initialTheme;
  const initialAuthorSession = {
    authenticated,
    configured: isAuthConfigured(),
  };

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      style={{
        backgroundColor:
          resolvedServerTheme === 'dark'
            ? '#09090b'
            : resolvedServerTheme === 'light'
              ? '#ffffff'
              : undefined,
        colorScheme: resolvedServerTheme,
      }}
      data-theme={resolvedServerTheme}
      data-theme-preference={initialTheme}
      className={`${initialTheme === 'dark' ? 'dark ' : ''}${geistSans.variable} ${geistMono.variable} ${petitFormal.variable} h-full antialiased`}
    >
      <head>
        <style>{themePrepaintStyles}</style>
        <script
          id="theme-bootstrap"
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
      </head>
      <body className="bg-background text-foreground">
        <JsonLd data={createWebsiteJsonLd(locale)} />
        <Providers
          initialLocale={locale}
          initialTheme={initialTheme}
          initialAuthorSession={initialAuthorSession}
        >
          {children}
        </Providers>
        {process.env.NODE_ENV === 'production' &&
          (isVercelAnalyticsEnabled || speedInsightsSampleRate > 0) && (
            <PrivacyAnalytics
              analyticsEnabled={isVercelAnalyticsEnabled}
              speedInsightsSampleRate={speedInsightsSampleRate}
              publicPaths={[
                '/',
                '/tools',
                ...mainPageConfig.projects.map(
                  ({ slug }) => `/project/${slug}`,
                ),
                ...mainPageConfig.tools
                  .filter(({ component }) => Boolean(component))
                  .map(({ slug }) => `/tool/${slug}`),
              ]}
            />
          )}
      </body>
    </html>
  );
}

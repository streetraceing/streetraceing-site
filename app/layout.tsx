import './globals.css';

import { geistMono, geistSans, petitFormal } from '@/app/fonts';
import { Providers } from '@/app/providers';
import { siteConfig } from '@/utils/config';
import { isAdmin, isAuthConfigured } from '@/utils/auth';
import {
  getLocale,
  getLocaleFromAcceptLanguage,
  getText,
  LOCALE_COOKIE,
} from '@/utils/i18n';
import { getTheme, THEME_COOKIE } from '@/utils/theme';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';
import Script from 'next/script';
import { cookies, headers } from 'next/headers';

const themeBootstrapScript = `
  (() => {
    try {
      const cookieTheme = document.cookie
        .split('; ')
        .find((value) => value.startsWith('${THEME_COOKIE}='))
        ?.split('=')[1];
      const storedTheme = window.localStorage.getItem('theme');
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
      root.style.backgroundColor =
        resolvedTheme === 'dark' ? '#09090b' : '#ffffff';
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

export async function generateMetadata(): Promise<Metadata> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const storedLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = storedLocale
    ? getLocale(storedLocale)
    : getLocaleFromAcceptLanguage(headerStore.get('accept-language'));

  return {
    title: siteConfig.name,
    description: getText(siteConfig.description, locale),
  };
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
        <meta name="color-scheme" content="light dark" />
        <style>{themePrepaintStyles}</style>
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {themeBootstrapScript}
        </Script>
        {process.env.NODE_ENV === 'production' && isVercelAnalyticsEnabled && (
          <Analytics />
        )}
        {process.env.NODE_ENV === 'production' &&
          speedInsightsSampleRate > 0 && (
            <SpeedInsights sampleRate={speedInsightsSampleRate} />
          )}
      </head>
      <body className="bg-background text-foreground">
        <Providers
          initialLocale={locale}
          initialTheme={initialTheme}
          initialAuthorSession={initialAuthorSession}
        >
          {children}
        </Providers>
      </body>
    </html>
  );
}

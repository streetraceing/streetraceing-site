import './globals.css';

import { geistMono, geistSans, petitFormal } from '@/app/fonts';
import { Providers } from '@/app/providers';
import { siteConfig } from '@/utils/config';
import {
  getLocale,
  getLocaleFromAcceptLanguage,
  getText,
  LOCALE_COOKIE,
} from '@/utils/i18n';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const themeBootstrapScript = `
  (() => {
    try {
      const storedTheme = window.localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const resolvedTheme =
        storedTheme === 'light' || storedTheme === 'dark'
          ? storedTheme
          : prefersDark
            ? 'dark'
            : 'light';
      const root = document.documentElement;

      root.classList.toggle('dark', resolvedTheme === 'dark');
      root.dataset.theme = resolvedTheme;
      root.style.colorScheme = resolvedTheme;
    } catch {}
  })();
`;

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
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const storedLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = storedLocale
    ? getLocale(storedLocale)
    : getLocaleFromAcceptLanguage(headerStore.get('accept-language'));

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${petitFormal.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        {process.env.NODE_ENV === 'production' && <Analytics />}
        {process.env.NODE_ENV === 'production' && <SpeedInsights />}
      </head>
      <body className="bg-background text-foreground">
        <Providers initialLocale={locale}>{children}</Providers>
      </body>
    </html>
  );
}

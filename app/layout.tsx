import './globals.css';

import meta from '@/package.json';

import { geistMono, geistSans, petitFormal } from '@/app/fonts';
import { Providers } from '@/app/providers';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: meta.name,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${petitFormal.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

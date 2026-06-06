import "./globals.css";

import { Providers } from "@/app/providers";
import type { Metadata } from "next";
import { geistMono, geistSans } from "@/app/fonts";

export const metadata: Metadata = {
  title: "streetraceing's website",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

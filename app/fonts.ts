import { Geist, Geist_Mono, Petit_Formal_Script } from 'next/font/google';

export const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const petitFormal = Petit_Formal_Script({
  variable: '--font-petit-formal',
  subsets: ['latin'],
  weight: '400',
});

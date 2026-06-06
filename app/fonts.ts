import { Geist, Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';

export const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const petitFormal = localFont({
  src: [
    {
      path: '../public/fonts/PetitFormalScript.ttf',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-petit-formal',
});

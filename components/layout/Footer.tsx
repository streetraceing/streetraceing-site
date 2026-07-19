'use client';

import { useLocale } from '@/app/providers';
import { Container } from '@/components/layout/Container';
import { footerPhrases } from '@/utils/footerPhrases';
import { footerConfig, siteConfig } from '@/utils/config';
import { cn, linkVariants, Separator, Typography } from '@heroui/react';
import NextLink from 'next/link';

export function Footer() {
  const linkSlots = linkVariants();
  const { copy, locale } = useLocale();
  const phrases = footerPhrases[locale];
  const phrase = phrases[0];

  return (
    <footer className="relative border-t bg-background overflow-hidden">
      <Container className="relative py-4 md:py-8 px-0 sm:px-0 md:px-6 lg:px-8 gap-6 flex flex-col justify-between md:flex-row">
        <div className="flex flex-col gap-4 items-center md:items-start">
          <Typography.Paragraph className="text-sm text-muted text-left">
            © {new Date().getFullYear()} -{' '}
            <a className="italic">{siteConfig.name}</a>
          </Typography.Paragraph>

          <div className="flex flex-wrap gap-4 text-sm justify-center md:justify-start">
            {footerConfig.links.map((link) => (
              <NextLink
                key={link.href}
                href={link.href}
                className={cn(
                  linkSlots.base(),
                  'no-underline hover:text-accent',
                )}
              >
                {link.icon && <link.icon className="size-4 mr-1" />}
                {link.label}
              </NextLink>
            ))}
          </div>
        </div>

        <Separator className="md:hidden bg-border" />

        <div className="flex flex-col justify-between min-w-0 md:max-w-[50%] md:text-right mx-0 px-4 md:px-0">
          <span className="font-petit-formal whitespace-nowrap mx-auto md:mx-[unset]">
            {copy.footer.slogan}
          </span>

          <Separator className="my-2 w-1/8 mx-auto md:mx-unset md:w-full" />

          <Typography.Paragraph className="wrap-break-word mx-auto md:mx-[unset] flex line-clamp-7 text-center md:text-right">
            {phrase}
          </Typography.Paragraph>
        </div>
      </Container>
    </footer>
  );
}

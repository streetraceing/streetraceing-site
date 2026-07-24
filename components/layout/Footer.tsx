'use client';

import { useLocale } from '@/app/providers';
import { Container } from '@/components/layout/Container';
import { footerConfig, siteConfig } from '@/utils/config';
import { footerPhrases } from '@/utils/footerPhrases';
import { normalizeInternalAnchorHref } from '@/utils/links';
import { cn, linkVariants, Separator, Typography } from '@heroui/react';
import NextLink from 'next/link';
import { useSyncExternalStore } from 'react';

const HOUR_IN_MS = 3_600_000;

function getUtcHourNumber() {
  return Math.floor(Date.now() / HOUR_IN_MS);
}

function getServerUtcHourNumber() {
  return getUtcHourNumber();
}

function subscribeToUtcHourChange(onStoreChange: () => void) {
  let timeoutId = 0;

  const scheduleNextHour = () => {
    const now = Date.now();
    const nextHour = (getUtcHourNumber() + 1) * HOUR_IN_MS;

    timeoutId = window.setTimeout(
      () => {
        onStoreChange();
        scheduleNextHour();
      },
      Math.max(nextHour - now, 0) + 100,
    );
  };

  scheduleNextHour();

  return () => {
    window.clearTimeout(timeoutId);
  };
}

export function Footer() {
  const linkSlots = linkVariants();
  const { copy, locale } = useLocale();
  const phrases = footerPhrases[locale];
  const hourNumber = useSyncExternalStore(
    subscribeToUtcHourChange,
    getUtcHourNumber,
    getServerUtcHourNumber,
  );
  const phraseIndex = hourNumber % phrases.length;

  return (
    <footer className="relative overflow-hidden border-t bg-background/75 backdrop-blur">
      <Container className="relative flex flex-col justify-between gap-6 px-0 py-4 sm:px-0 md:flex-row md:px-6 md:py-8 lg:px-8">
        <div className="flex flex-col items-center gap-4 md:items-start">
          <Typography.Paragraph className="text-left text-sm text-muted">
            © {new Date().getUTCFullYear()} -{' '}
            <NextLink
              href="/"
              className={cn(linkSlots.base(), 'italic no-underline')}
            >
              {siteConfig.name}
            </NextLink>
          </Typography.Paragraph>

          <div className="flex flex-wrap justify-center gap-4 text-sm md:justify-start">
            {footerConfig.links.map((link) => {
              const href = normalizeInternalAnchorHref(link.href);

              return (
                <NextLink
                  key={link.href}
                  href={href}
                  className={cn(
                    linkSlots.base(),
                    'no-underline hover:text-accent',
                  )}
                >
                  {link.icon ? <link.icon className="mr-1 size-4" /> : null}
                  {link.label}
                </NextLink>
              );
            })}
          </div>
        </div>

        <Separator className="bg-border md:hidden" />

        <div className="mx-0 flex min-w-0 flex-col justify-between px-4 md:max-w-[50%] md:px-0 md:text-right">
          <span className="mx-auto whitespace-nowrap font-petit-formal md:mx-[unset]">
            {copy.footer.slogan}
          </span>

          <Separator className="mx-auto my-2 w-1/8 md:mx-unset md:w-full" />

          <Typography.Paragraph className="mx-auto flex line-clamp-7 wrap-break-word text-center md:mx-[unset] md:text-right">
            {phrases[phraseIndex]}
          </Typography.Paragraph>
        </div>
      </Container>
    </footer>
  );
}

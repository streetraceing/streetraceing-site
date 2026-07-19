'use client';

import { Container } from '@/components/layout/Container';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { useLocale } from '@/app/providers';
import { headerConfig, siteConfig } from '@/utils/config';
import { getText } from '@/utils/i18n';
import { Button, cn, linkVariants, Typography } from '@heroui/react';
import NextLink from 'next/link';
import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

export function Header() {
  const linkSlots = linkVariants();
  const { copy, locale } = useLocale();

  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/75 backdrop-blur">
        <Container className="grid h-16 grid-cols-[auto_1fr] items-center gap-4 md:grid-cols-[auto_1fr_auto]">
          <NextLink
            href="/"
            className={cn(
              linkSlots.base(),
              'flex items-center gap-2 font-semibold text-lg no-underline min-w-0 justify-self-start',
            )}
          >
            <Image
              src="/images/streetraceing.jpeg"
              alt={copy.header.logoAlt}
              width={40}
              height={40}
              preload
              loading="eager"
              className="rounded-full size-6"
            />
            <Typography.Paragraph className="truncate">
              {siteConfig.name}
            </Typography.Paragraph>
          </NextLink>

          <nav className="hidden md:flex min-w-0 gap-4 justify-self-start">
            {headerConfig.links.map((link) => (
              <NextLink
                href={link.href}
                className={cn(
                  linkSlots.base(),
                  'flex items-center gap-2 min-w-0 no-underline',
                )}
                key={link.href}
              >
                <link.icon className="size-5 shrink-0 text-muted" />
                <Typography.Paragraph className="truncate">
                  {getText(link.label, locale)}
                </Typography.Paragraph>
              </NextLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0 justify-self-end">
            <nav className="hidden md:flex min-w-0 gap-4 justify-self-start">
              <LanguageSwitcher />
              <ThemeSwitcher />
            </nav>

            <Button
              isIconOnly
              size="sm"
              variant="tertiary"
              className="md:hidden"
              onPress={() => setOpen((v) => !v)}
            >
              {open ? (
                <X className="size-4.5" />
              ) : (
                <Menu className="size-4.5" />
              )}
            </Button>
          </div>
        </Container>
      </header>

      {open && (
        <div className="fixed inset-x-0 top-16 z-40 border-b border-t bg-background/70 shadow-lg backdrop-blur-xl [-webkit-backdrop-filter:blur(24px)] md:hidden">
          <Container className="flex flex-col gap-4 py-4">
            <Typography.Heading level={5}>
              {copy.header.navigation}
            </Typography.Heading>

            {headerConfig.links.map((link) => (
              <NextLink key={link.href} href={link.href}>
                <div
                  className={cn(linkSlots.base(), 'no-underline')}
                  onClick={() => setOpen(false)}
                >
                  <link.icon className="mr-2 size-5 text-muted" />
                  <Typography.Paragraph className="truncate">
                    {getText(link.label, locale)}
                  </Typography.Paragraph>
                </div>
              </NextLink>
            ))}

            <Typography.Heading level={5}>
              {copy.theme.label}
            </Typography.Heading>

            <ThemeSwitcher variant="group" />

            <Typography.Heading level={5}>
              {copy.language.label}
            </Typography.Heading>

            <LanguageSwitcher fullWidth />
          </Container>
        </div>
      )}
    </>
  );
}

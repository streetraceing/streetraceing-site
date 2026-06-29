'use client';

import { Container } from '@/components/layout/Container';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { headerConfig, siteConfig } from '@/utils/config';
import { Button, Link, Typography } from '@heroui/react';
import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/75 backdrop-blur">
      <div className="relative">
        <Container className="h-16 grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_auto] items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-lg no-underline min-w-0 justify-self-start"
          >
            <Image
              src="/images/streetraceing.jpeg"
              alt="logo"
              width={40}
              height={40}
              preload
              loading="eager"
              className="rounded-full size-6"
            />
            <Typography.Paragraph className="truncate">
              {siteConfig.name}
            </Typography.Paragraph>
          </Link>

          <nav className="hidden md:flex min-w-0 gap-4 justify-self-start">
            {headerConfig.links.map((link) => (
              <Link
                href={link.href}
                className="flex items-center gap-2 min-w-0 no-underline"
                key={link.href}
              >
                <link.icon className="size-5 shrink-0 text-muted" />
                <Typography.Paragraph className="truncate">
                  {link.label}
                </Typography.Paragraph>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0 justify-self-end">
            <nav className="hidden md:flex min-w-0 gap-4 justify-self-start">
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

        {open && (
          <div className="absolute left-0 top-full w-full md:hidden border-b border-t bg-background shadow-lg z-50">
            <Container className="py-4 flex flex-col gap-4">
              <Typography.Heading level={5}>Навигация</Typography.Heading>

              {headerConfig.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="no-underline"
                  onPress={() => setOpen(false)}
                >
                  <link.icon className="size-5 mr-2 text-muted" />
                  <Typography.Paragraph className="truncate">
                    {link.label}
                  </Typography.Paragraph>
                </Link>
              ))}

              <Typography.Heading level={5}>Тема сайта</Typography.Heading>

              <ThemeSwitcher variant="group" />
            </Container>
          </div>
        )}
      </div>
    </header>
  );
}

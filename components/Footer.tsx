import meta from '@/package.json';

import { Container } from '@/components/Container';
import { Link, Separator } from '@heroui/react';
import { phrases } from '@/components/header/Phrases';
import { useMemo } from 'react';

type Config = {
  links: {
    label: string;
    href?: string;
  }[];
};

export function Footer() {
  const config: Config = {
    links: [
      {
        label: 'Telegram',
        href: 'https://t.me/streetraceing',
      },
      {
        label: 'ВКонтакте',
        href: 'https://vk.ru/streetraceing',
      },
    ],
  };

  const phrase = useMemo(
    () => phrases[Math.floor(Math.random() * phrases.length)],
    [],
  );

  return (
    <footer className="relative border-t border-white/10 bg-background overflow-hidden">
      <Container className="relative py-8 gap-6 flex flex-col justify-between md:flex-row">
        <div className="flex flex-col gap-4">
          <span className="text-sm text-muted text-left">
            © {new Date().getFullYear()} - <a className="italic">{meta.name}</a>
          </span>

          <div className="flex flex-wrap gap-4 text-sm">
            {config.links.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between min-w-0 md:max-w-[50%] md:text-right mx-0">
          <span className="font-petit-formal whitespace-nowrap mx-auto md:mx-[unset]">
            life is good ❤️
          </span>

          <Separator className="my-2 md:w-3/4 md:ml-auto" />

          <span className="wrap-break-word mx-auto md:mx-[unset] line-clamp-7">
            {phrase}
          </span>
        </div>
      </Container>
    </footer>
  );
}

import { Container } from '@/components/Container';
import { footerPhrases } from '@/config/phrases';
import { siteConfig } from '@/config/site';
import { Link, Separator, Typography } from '@heroui/react';

export const dynamic = 'force-dynamic';

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
      {
        label: 'Github',
        href: 'https://github.com/streetraceing',
      },
    ],
  };

  const phrase =
    footerPhrases.ru[Math.floor(Math.random() * footerPhrases.ru.length)];

  return (
    <footer className="relative border-t border-white/10 bg-background overflow-hidden">
      <Container className="relative py-8 gap-6 flex flex-col justify-between md:flex-row">
        <div className="flex flex-col gap-4">
          <Typography.Paragraph className="text-sm text-muted text-left">
            © {new Date().getFullYear()} -{' '}
            <a className="italic">{siteConfig.name}</a>
          </Typography.Paragraph>

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

          <Separator className="my-2" />

          <Typography.Paragraph className="wrap-break-word mx-auto md:mx-[unset] line-clamp-7">
            {phrase}
          </Typography.Paragraph>
        </div>
      </Container>
    </footer>
  );
}

import { Container } from '@/components/layout/Container';
import { footerPhrases } from '@/utils/phrases';
import { footerConfig, siteConfig } from '@/utils/site';
import { Link, Separator, Typography } from '@heroui/react';

export const dynamic = 'force-dynamic';

export function Footer() {
  const phrase =
    footerPhrases.ru[Math.floor(Math.random() * footerPhrases.ru.length)]; // eslint-disable-line react-hooks/purity

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
              <Link
                key={link.href}
                href={link.href}
                className="no-underline hover:text-accent"
              >
                {link.icon && <link.icon className="size-4 mr-1" />}
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <Separator className='md:hidden bg-border' />

        <div className="flex flex-col justify-between min-w-0 md:max-w-[50%] md:text-right mx-0">
          <span className="font-petit-formal whitespace-nowrap mx-auto md:mx-[unset]">
            life is good ❤️
          </span>

          <Separator className="my-2 w-1/8 mx-auto md:mx-unset md:w-full" />

          <Typography.Paragraph className="wrap-break-word mx-auto md:mx-[unset] flex line-clamp-7">
            {phrase}
          </Typography.Paragraph>
        </div>
      </Container>
    </footer>
  );
}

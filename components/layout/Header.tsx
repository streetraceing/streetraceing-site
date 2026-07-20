'use client';

import { Container } from '@/components/layout/Container';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { useLocale } from '@/app/providers';
import { AUTHOR_SESSION_CHANGED_EVENT } from '@/utils/client-events';
import { headerConfig, siteConfig } from '@/utils/config';
import { getText } from '@/utils/i18n';
import {
  Alert,
  Button,
  cn,
  Dropdown,
  FieldError,
  Form,
  Input,
  Label,
  linkVariants,
  Modal,
  TextField,
  Typography,
} from '@heroui/react';
import NextLink from 'next/link';
import { Menu, LockKeyhole, ShieldCheck, X } from 'lucide-react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { type FormEvent, type MouseEvent, useEffect, useState } from 'react';

type SessionResponse = {
  authenticated: boolean;
  configured: boolean;
};

function AuthorMenu() {
  const { copy } = useLocale();
  const strings = copy.stats;
  const [session, setSession] = useState<SessionResponse>();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string>();
  const [isLoginPending, setIsLoginPending] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(strings.errors.session);
        }

        return (await response.json()) as SessionResponse;
      })
      .then((nextSession) => {
        if (!isCancelled) {
          setSession(nextSession);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setSession({ authenticated: false, configured: false });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [strings.errors.session]);

  async function refreshSession() {
    try {
      const response = await fetch('/api/auth/session', { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(strings.errors.session);
      }

      setSession((await response.json()) as SessionResponse);
    } catch {
      setSession({ authenticated: false, configured: false });
    }
  }

  async function login(event: FormEvent<HTMLFormElement>, close: () => void) {
    event.preventDefault();
    setIsLoginPending(true);
    setLoginError(undefined);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? strings.errors.login);
      }

      setSession({ authenticated: true, configured: true });
      setPassword('');
      window.dispatchEvent(new Event(AUTHOR_SESSION_CHANGED_EVENT));
      close();
    } catch (caughtError) {
      setLoginError(
        caughtError instanceof Error
          ? caughtError.message
          : strings.errors.login,
      );
    } finally {
      setIsLoginPending(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setSession((current) => ({
      authenticated: false,
      configured: current?.configured ?? false,
    }));
    window.dispatchEvent(new Event(AUTHOR_SESSION_CHANGED_EVENT));
  }

  return (
    <div className="hidden md:block">
      <Dropdown
        isOpen={isMenuOpen}
        onOpenChange={(nextOpen) => {
          setIsMenuOpen(nextOpen);

          if (nextOpen) {
            void refreshSession();
          }
        }}
      >
        <Button
          aria-label={
            session?.authenticated ? strings.logout : strings.loginAsAuthor
          }
          isIconOnly
          size="sm"
          variant="tertiary"
        >
          {session?.authenticated ? (
            <ShieldCheck className="size-4" />
          ) : (
            <LockKeyhole className="size-4" />
          )}
        </Button>
        <Dropdown.Popover placement="bottom end">
          <Dropdown.Menu
            onAction={(key) => {
              if (key !== 'author-action') {
                return;
              }

              if (session?.authenticated) {
                void logout();
                return;
              }

              setLoginError(undefined);
              setIsLoginOpen(true);
            }}
          >
            <Dropdown.Item
              id="author-action"
              textValue={
                session?.authenticated ? strings.logout : strings.loginAsAuthor
              }
              variant={session?.authenticated ? 'danger' : 'default'}
            >
              <Label>
                {session?.authenticated
                  ? strings.logout
                  : strings.loginAsAuthor}
              </Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      <Modal>
        <Modal.Backdrop
          isOpen={isLoginOpen}
          variant="blur"
          onOpenChange={setIsLoginOpen}
        >
          <Modal.Container size="sm">
            <Modal.Dialog className="w-[calc(100vw-2rem)] sm:max-w-md">
              {({ close }) => (
                <Form
                  className="flex flex-col"
                  onSubmit={(event) => void login(event, close)}
                >
                  <Modal.CloseTrigger />
                  <Modal.Header>
                    <Modal.Heading>{strings.loginAsAuthor}</Modal.Heading>
                  </Modal.Header>
                  <Modal.Body className="flex flex-col gap-4">
                    <TextField
                      isRequired
                      fullWidth
                      name="author-password"
                      value={password}
                      onChange={setPassword}
                      validate={(value) =>
                        value ? null : strings.enterPassword
                      }
                    >
                      <Label>{strings.authorPassword}</Label>
                      <Input
                        type="password"
                        autoComplete="current-password"
                        variant="secondary"
                      />
                      <FieldError />
                    </TextField>

                    {loginError && (
                      <Alert status="danger">
                        <Alert.Indicator />
                        <Alert.Content>
                          <Alert.Title>{strings.loginFailed}</Alert.Title>
                          <Alert.Description>{loginError}</Alert.Description>
                        </Alert.Content>
                      </Alert>
                    )}
                  </Modal.Body>
                  <Modal.Footer>
                    <Button type="submit" isPending={isLoginPending}>
                      <LockKeyhole />
                      {strings.login}
                    </Button>
                  </Modal.Footer>
                </Form>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

export function Header() {
  const linkSlots = linkVariants();
  const { copy, locale } = useLocale();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);

  function handleHomeNavigation(event: MouseEvent<HTMLAnchorElement>) {
    setOpen(false);

    if (pathname !== '/') {
      return;
    }

    event.preventDefault();
    window.history.replaceState(window.history.state, '', '/');
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }

  function handleSectionNavigation(
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) {
    setOpen(false);

    if (pathname !== '/') {
      return;
    }

    const hash = href.slice(href.indexOf('#'));
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));

    if (!target) {
      return;
    }

    event.preventDefault();

    if (window.location.hash !== hash) {
      window.history.pushState(window.history.state, '', `/${hash}`);
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/75 backdrop-blur">
        <Container className="grid h-16 grid-cols-[auto_1fr] items-center gap-4 md:grid-cols-[auto_1fr_auto]">
          <NextLink
            href="/"
            scroll
            onClick={handleHomeNavigation}
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
                scroll
                onClick={(event) => handleSectionNavigation(event, link.href)}
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
              <AuthorMenu />
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
              <NextLink
                key={link.href}
                href={link.href}
                scroll
                className={cn(linkSlots.base(), 'no-underline')}
                onClick={(event) => handleSectionNavigation(event, link.href)}
              >
                <link.icon className="mr-2 size-5 text-muted" />
                <Typography.Paragraph className="truncate">
                  {getText(link.label, locale)}
                </Typography.Paragraph>
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

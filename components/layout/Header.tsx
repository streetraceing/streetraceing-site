'use client';

import { Button, ButtonRipple } from '@/components/ui/Button';
import { useAuthorSession, useLocale } from '@/app/providers';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Container } from '@/components/layout/Container';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { headerConfig, siteConfig } from '@/utils/config';
import { getText } from '@/utils/i18n';
import { normalizeInternalAnchorHref } from '@/utils/links';
import {
  Alert,
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
import { LockKeyhole, Menu, ShieldCheck, X } from 'lucide-react';
import Image from 'next/image';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import {
  type FormEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

function AuthorMenu() {
  const { copy } = useLocale();
  const strings = copy.stats;
  const { session, isLoading, loginAsAuthor, logoutAuthor } =
    useAuthorSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string>();
  const [isLoginPending, setIsLoginPending] = useState(false);

  const isConfigured = session?.configured ?? true;
  const isAuthenticated = session?.authenticated ?? false;
  const actionLabel = !isConfigured
    ? strings.authorNotConfigured
    : isAuthenticated
      ? strings.logout
      : strings.loginAsAuthor;

  async function login(event: FormEvent<HTMLFormElement>, close: () => void) {
    event.preventDefault();
    setIsLoginPending(true);
    setLoginError(undefined);

    const error = await loginAsAuthor(password);

    if (error) {
      setLoginError(error);
      setIsLoginPending(false);
      return;
    }

    setPassword('');
    setIsLoginPending(false);
    close();
  }

  async function logout() {
    await logoutAuthor();
  }

  return (
    <div>
      {isLoading ? (
        <button
          type="button"
          aria-label={actionLabel}
          aria-busy="true"
          disabled
          className="button button--icon-only button--sm button--tertiary"
        >
          <ButtonRipple disabled />
          <LockKeyhole className="size-4" />
        </button>
      ) : (
        <Dropdown isOpen={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <Dropdown.Trigger
            aria-label={actionLabel}
            type="button"
            className="button button--icon-only button--sm button--tertiary flex"
          >
            <ButtonRipple />
            {isAuthenticated ? (
              <ShieldCheck className="size-4" />
            ) : (
              <LockKeyhole className="size-4" />
            )}
          </Dropdown.Trigger>
          <Dropdown.Popover placement="bottom end">
            <Dropdown.Menu
              onAction={(key) => {
                if (key !== 'author-action' || !isConfigured) {
                  return;
                }

                if (isAuthenticated) {
                  void logout();
                  return;
                }

                setLoginError(undefined);
                setIsLoginOpen(true);
              }}
            >
              <Dropdown.Item
                id="author-action"
                isDisabled={!isConfigured}
                textValue={actionLabel}
                variant={isAuthenticated ? 'danger' : 'default'}
              >
                <Label>{actionLabel}</Label>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      )}

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
                    <Modal.Heading className="font-semibold">
                      {strings.loginAsAuthor}
                    </Modal.Heading>
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
                      className="flex gap-1 flex-col"
                    >
                      <Label>{strings.authorPassword}</Label>
                      <Input
                        type="password"
                        autoComplete="current-password"
                        variant="secondary"
                      />
                      <FieldError />
                    </TextField>

                    {loginError ? (
                      <Alert status="danger" className="bg-surface-secondary">
                        <Alert.Indicator />
                        <Alert.Content>
                          <Alert.Title>{strings.loginFailed}</Alert.Title>
                          <Alert.Description>{loginError}</Alert.Description>
                        </Alert.Content>
                      </Alert>
                    ) : null}
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
  const navigationLinks = headerConfig.links.map((link) => ({
    ...link,
    href: normalizeInternalAnchorHref(link.href),
  }));
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const desktopMediaQuery = window.matchMedia('(min-width: 1180px)');
    const closeMenuAtDesktopWidth = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setOpen(false);
      }
    };

    desktopMediaQuery.addEventListener('change', closeMenuAtDesktopWidth);

    return () =>
      desktopMediaQuery.removeEventListener('change', closeMenuAtDesktopWidth);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const firstInteractiveElement =
      mobileMenuRef.current?.querySelector<HTMLElement>(
        'a[href], button:not([disabled])',
      );
    firstInteractiveElement?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      setOpen(false);
      menuButtonRef.current?.focus();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

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
    <div className="sticky top-0 z-50 bg-background/75 backdrop-blur-xl [-webkit-backdrop-filter:blur(16px)]">
      <header className="relative z-20 border-b">
        <Container className="grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:gap-4 min-[1180px]:grid-cols-[auto_minmax(0,1fr)_auto]">
          <NextLink
            href="/"
            scroll
            onClick={handleHomeNavigation}
            className={cn(
              linkSlots.base(),
              'flex min-w-0 max-w-[min(64vw,18rem)] items-center gap-2 justify-self-start text-lg font-semibold no-underline min-[1180px]:max-w-none',
            )}
          >
            <Image
              src="/images/streetraceing.jpeg"
              alt={copy.header.logoAlt}
              width={40}
              height={40}
              preload
              loading="eager"
              className="size-6 rounded-full"
            />
            <Typography.Paragraph className="truncate">
              {siteConfig.name}
            </Typography.Paragraph>
          </NextLink>

          <nav
            aria-label={copy.header.navigation}
            className="hidden min-w-0 items-center gap-3 justify-self-start min-[1180px]:flex"
          >
            {navigationLinks.map((link) => (
              <NextLink
                href={link.href}
                scroll
                onClick={(event) => handleSectionNavigation(event, link.href)}
                className={cn(
                  linkSlots.base(),
                  'flex min-w-0 items-center gap-2 no-underline',
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

          <div className="flex shrink-0 items-center gap-2 justify-self-end">
            <AuthorMenu />
            <div className="hidden items-center gap-2 min-[1180px]:flex">
              <LanguageSwitcher />
              <ThemeSwitcher />
            </div>

            <Button
              ref={menuButtonRef}
              aria-controls="mobile-navigation"
              aria-expanded={open}
              aria-label={open ? copy.header.closeMenu : copy.header.openMenu}
              isIconOnly
              size="sm"
              variant="tertiary"
              className="min-[1180px]:hidden"
              onPress={() => setOpen((value) => !value)}
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

      {open ? (
        <nav
          ref={mobileMenuRef}
          id="mobile-navigation"
          aria-label={copy.header.navigation}
          className="absolute inset-x-0 top-full z-10 isolate max-h-[calc(100dvh-4rem)] overflow-x-hidden overflow-y-auto border-b border-t shadow-lg min-[1180px]:hidden"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 bg-background/75 backdrop-blur-2xl [-webkit-backdrop-filter:blur(24px)]"
          />
          <Container className="relative z-10 flex flex-col gap-4 py-4">
            <Typography.Heading level={2} className="text-base">
              {copy.header.navigation}
            </Typography.Heading>

            {navigationLinks.map((link) => (
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

            <Typography.Heading level={2} className="text-base">
              {copy.theme.label}
            </Typography.Heading>
            <ThemeSwitcher variant="group" />

            <Typography.Heading level={2} className="text-base">
              {copy.language.label}
            </Typography.Heading>
            <LanguageSwitcher fullWidth />
          </Container>
        </nav>
      ) : null}
    </div>
  );
}

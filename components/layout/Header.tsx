'use client';

import { Button, ButtonRipple } from '@/components/ui/Button';
import { useAuthorSession, useLocale } from '@/app/providers';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useReducedMotion } from '@/components/hooks/useReducedMotion';
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

const navigationLinks = headerConfig.links.map((link) => ({
  ...link,
  href: normalizeInternalAnchorHref(link.href),
}));

function isNavigationLinkActive(pathname: string, href: string) {
  return href === '/tools'
    ? pathname === '/tools' || pathname.startsWith('/tool/')
    : false;
}

function isPlainNavigation(event: MouseEvent<HTMLAnchorElement>) {
  return !(
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    (event.currentTarget.target && event.currentTarget.target !== '_self') ||
    event.currentTarget.hasAttribute('download')
  );
}

function focusDestination(target: HTMLElement) {
  if (!target.hasAttribute('tabindex')) {
    target.setAttribute('tabindex', '-1');
    target.addEventListener('blur', () => target.removeAttribute('tabindex'), {
      once: true,
    });
  }
  target.focus({ preventScroll: true });
}

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
  const [isLogoutPending, setIsLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState<string>();

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
    if (isLogoutPending) {
      return;
    }

    setIsLogoutPending(true);
    setLogoutError(undefined);
    try {
      setLogoutError(await logoutAuthor());
    } catch {
      setLogoutError(strings.errors.logout);
    } finally {
      setIsLogoutPending(false);
    }
  }

  return (
    <div className="relative">
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
            aria-label={
              isLogoutPending ? copy.header.logoutPending : actionLabel
            }
            aria-busy={isLogoutPending}
            isPending={isLogoutPending}
            type="button"
            className="button button--icon-only button--sm button--tertiary flex"
          >
            <ButtonRipple disabled={isLogoutPending} />
            {isAuthenticated ? (
              <ShieldCheck className="size-4" />
            ) : (
              <LockKeyhole className="size-4" />
            )}
          </Dropdown.Trigger>
          <Dropdown.Popover placement="bottom end">
            <Dropdown.Menu
              onAction={(key) => {
                if (
                  key !== 'author-action' ||
                  !isConfigured ||
                  isLogoutPending
                ) {
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
                isDisabled={!isConfigured || isLogoutPending}
                textValue={actionLabel}
                variant={isAuthenticated ? 'danger' : 'default'}
              >
                <Label>{actionLabel}</Label>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      )}

      <span
        role="status"
        className={
          isLogoutPending
            ? 'absolute right-0 top-full z-50 mt-2 whitespace-nowrap rounded-lg bg-surface px-3 py-2 text-sm shadow-lg'
            : 'sr-only'
        }
      >
        {isLogoutPending ? copy.header.logoutPending : ''}
      </span>
      {logoutError ? (
        <Alert
          role="alert"
          status="danger"
          className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] bg-surface shadow-lg"
        >
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{copy.header.logoutFailed}</Alert.Title>
            <Alert.Description>{logoutError}</Alert.Description>
          </Alert.Content>
          <Button
            isIconOnly
            size="sm"
            variant="tertiary"
            aria-label={copy.header.dismissError}
            onPress={() => setLogoutError(undefined)}
          >
            <X className="size-4" />
          </Button>
        </Alert>
      ) : null}

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
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLElement>(null);
  // Header instances are replaced across pages; keep the keyboard intent for
  // the next home navigation without persisting anything in browser storage.
  const pendingKeyboardDestinationRef = useRef<string | undefined>(undefined);

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

  useEffect(() => {
    if (pathname !== '/' || !pendingKeyboardDestinationRef.current) {
      return;
    }

    const destination = pendingKeyboardDestinationRef.current;
    const observer = new MutationObserver(focusPendingDestination);
    function focusPendingDestination() {
      if (pendingKeyboardDestinationRef.current !== destination) {
        observer.disconnect();
        return;
      }
      const target = document.getElementById(destination);
      if (target) {
        focusDestination(target);
        pendingKeyboardDestinationRef.current = undefined;
        observer.disconnect();
      }
    }

    observer.observe(document.body, { childList: true, subtree: true });
    const frame = window.requestAnimationFrame(focusPendingDestination);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  function handleHomeNavigation(event: MouseEvent<HTMLAnchorElement>) {
    if (!isPlainNavigation(event)) {
      return;
    }

    setOpen(false);
    pendingKeyboardDestinationRef.current =
      event.detail === 0 && pathname !== '/' ? 'main-content' : undefined;

    if (pathname !== '/') {
      return;
    }

    event.preventDefault();
    window.history.replaceState(window.history.state, '', '/');
    const target = document.getElementById('main-content');
    if (event.detail === 0 && target) {
      focusDestination(target);
    }
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: reducedMotion ? 'instant' : 'smooth',
    });
  }

  function handleSectionNavigation(
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) {
    if (!isPlainNavigation(event)) {
      return;
    }

    setOpen(false);
    pendingKeyboardDestinationRef.current = undefined;

    if (!href.startsWith('/#')) {
      return;
    }

    const hash = href.slice(href.indexOf('#'));
    const destination = decodeURIComponent(hash.slice(1));
    if (pathname !== '/') {
      if (event.detail === 0) {
        pendingKeyboardDestinationRef.current = destination;
      }
      return;
    }

    const target = document.getElementById(destination);
    if (!target) {
      return;
    }

    event.preventDefault();

    if (window.location.hash !== hash) {
      window.history.pushState(window.history.state, '', `/${hash}`);
    }

    if (event.detail === 0) {
      focusDestination(target);
    }
    target.scrollIntoView({
      behavior: reducedMotion ? 'instant' : 'smooth',
      block: 'start',
    });
  }

  function handleSkipNavigation(event: MouseEvent<HTMLAnchorElement>) {
    if (!isPlainNavigation(event)) {
      return;
    }

    const target = document.getElementById('main-content');
    if (!target) {
      return;
    }

    event.preventDefault();
    setOpen(false);
    focusDestination(target);
    target.scrollIntoView({ behavior: 'instant', block: 'start' });
  }

  return (
    <div className="sticky top-0 z-50 sm:bg-background/75 backdrop-blur-xl [-webkit-backdrop-filter:blur(16px)] bg-background">
      <NextLink
        href="#main-content"
        onClick={handleSkipNavigation}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-foreground focus:shadow-lg"
      >
        {copy.header.skipToContent}
      </NextLink>
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
            className="hidden min-w-0 items-center gap-4 justify-self-start min-[1180px]:flex"
          >
            {navigationLinks.map((link) => (
              <NextLink
                href={link.href}
                scroll
                aria-current={
                  isNavigationLinkActive(pathname, link.href)
                    ? 'page'
                    : undefined
                }
                onClick={(event) => handleSectionNavigation(event, link.href)}
                className={cn(
                  linkSlots.base(),
                  'flex min-w-0 items-center gap-2 no-underline',
                  isNavigationLinkActive(pathname, link.href) &&
                    'text-foreground',
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
            className="pointer-events-none absolute inset-0 z-0 bg-background sm:bg-background/75 backdrop-blur-2xl [-webkit-backdrop-filter:blur(24px)]"
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
                aria-current={
                  isNavigationLinkActive(pathname, link.href)
                    ? 'page'
                    : undefined
                }
                className={cn(
                  linkSlots.base(),
                  'no-underline',
                  isNavigationLinkActive(pathname, link.href) &&
                    'text-foreground',
                )}
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

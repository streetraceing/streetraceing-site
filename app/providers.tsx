'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  defaultLocale,
  LOCALE_COOKIE,
  translations,
  type Locale,
  type Translation,
} from '@/utils/i18n';

export type Theme = 'system' | 'light' | 'dark';

export type AuthorSession = {
  authenticated: boolean;
  configured: boolean;
};

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  copy: Translation;
};

type AuthorSessionContextValue = {
  session: AuthorSession | undefined;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  loginAsAuthor: (password: string) => Promise<string | undefined>;
  logoutAuthor: () => Promise<string | undefined>;
};

const THEME_STORAGE_KEY = 'theme';
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);
const AuthorSessionContext = createContext<
  AuthorSessionContextValue | undefined
>(undefined);

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'system';
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  return storedTheme === 'light' ||
    storedTheme === 'dark' ||
    storedTheme === 'system'
    ? storedTheme
    : 'system';
}

function applyTheme(theme: Theme) {
  const resolvedTheme =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;

  const root = document.documentElement;

  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
}

async function readApiError(response: Response) {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === 'string' ? body.error : undefined;
  } catch {
    return undefined;
  }
}

async function requestAuthorSession(signal?: AbortSignal) {
  const response = await fetch('/api/auth/session', {
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new Error('Unable to load the author session.');
  }

  return (await response.json()) as AuthorSession;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used inside Providers.');
  }

  return context;
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error('useLocale must be used inside Providers.');
  }

  return context;
}

export function useAuthorSession() {
  const context = useContext(AuthorSessionContext);

  if (!context) {
    throw new Error('useAuthorSession must be used inside Providers.');
  }

  return context;
}

export function Providers({
  children,
  initialLocale = defaultLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [authorSession, setAuthorSession] = useState<AuthorSession>();
  const [isAuthorSessionLoading, setIsAuthorSessionLoading] = useState(true);

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    document.documentElement.lang = nextLocale;
    document.cookie = `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, []);

  const refreshSession = useCallback(async () => {
    setIsAuthorSessionLoading(true);

    try {
      setAuthorSession(await requestAuthorSession());
    } catch {
      setAuthorSession(
        (current) => current ?? { authenticated: false, configured: true },
      );
    } finally {
      setIsAuthorSessionLoading(false);
    }
  }, []);

  const loginAsAuthor = useCallback(
    async (password: string) => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });

        if (!response.ok) {
          return (
            (await readApiError(response)) ??
            translations[locale].stats.errors.login
          );
        }

        setAuthorSession({ authenticated: true, configured: true });
        return undefined;
      } catch {
        return translations[locale].stats.errors.login;
      }
    },
    [locale],
  );

  const logoutAuthor = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });

      if (!response.ok) {
        return (
          (await readApiError(response)) ??
          translations[locale].stats.errors.logout
        );
      }

      setAuthorSession((current) => ({
        authenticated: false,
        configured: current?.configured ?? true,
      }));
      return undefined;
    } catch {
      return translations[locale].stats.errors.logout;
    }
  }, [locale]);

  useEffect(() => {
    applyTheme(theme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [theme]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        const nextTheme = getStoredTheme();
        setThemeState(nextTheme);
        applyTheme(nextTheme);
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void requestAuthorSession(controller.signal)
      .then((session) => {
        setAuthorSession(session);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setAuthorSession(
            (current) => current ?? { authenticated: false, configured: true },
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsAuthorSessionLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  const themeValue = useMemo(() => ({ theme, setTheme }), [setTheme, theme]);
  const localeValue = useMemo(
    () => ({ locale, setLocale, copy: translations[locale] }),
    [locale, setLocale],
  );
  const authorSessionValue = useMemo(
    () => ({
      session: authorSession,
      isLoading: isAuthorSessionLoading,
      refreshSession,
      loginAsAuthor,
      logoutAuthor,
    }),
    [
      authorSession,
      isAuthorSessionLoading,
      loginAsAuthor,
      logoutAuthor,
      refreshSession,
    ],
  );

  return (
    <ThemeContext.Provider value={themeValue}>
      <LocaleContext.Provider value={localeValue}>
        <AuthorSessionContext.Provider value={authorSessionValue}>
          {children}
        </AuthorSessionContext.Provider>
      </LocaleContext.Provider>
    </ThemeContext.Provider>
  );
}

'use client';

import { useRouter } from 'next/navigation';
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

import {
  getTheme,
  THEME_COOKIE,
  THEME_STORAGE_KEY,
  type Theme,
} from '@/utils/theme';
import { getJsonError, isJsonObject, readJsonResponse } from '@/utils/json';

export type { Theme } from '@/utils/theme';

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

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);
const AuthorSessionContext = createContext<
  AuthorSessionContextValue | undefined
>(undefined);
const PREFERENCE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function getStoredTheme(fallback: Theme = 'system'): Theme {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme ? getTheme(storedTheme) : fallback;
  } catch {
    return fallback;
  }
}

function writePreferenceCookie(name: string, value: string) {
  try {
    document.cookie = `${name}=${value}; path=/; max-age=${PREFERENCE_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
  } catch {
    // The in-memory preference still applies when browser storage is blocked.
  }
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
  root.dataset.themePreference = theme;
  root.style.colorScheme = resolvedTheme;
  root.style.backgroundColor = resolvedTheme === 'dark' ? '#09090b' : '#ffffff';
}

async function requestAuthorSession(signal?: AbortSignal) {
  const response = await fetch('/api/auth/session', {
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new Error('Unable to load the author session.');
  }

  const body = await readJsonResponse(response);

  if (
    !isJsonObject(body) ||
    typeof body.authenticated !== 'boolean' ||
    typeof body.configured !== 'boolean'
  ) {
    throw new Error('Unable to load the author session.');
  }

  return {
    authenticated: body.authenticated,
    configured: body.configured,
  };
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
  initialTheme = 'system',
  initialAuthorSession,
}: {
  children: ReactNode;
  initialLocale?: Locale;
  initialTheme?: Theme;
  initialAuthorSession: AuthorSession;
}) {
  const router = useRouter();
  const [theme, setThemeState] = useState<Theme>(() =>
    getStoredTheme(initialTheme),
  );
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [authorSession, setAuthorSession] =
    useState<AuthorSession>(initialAuthorSession);
  const [isAuthorSessionLoading, setIsAuthorSessionLoading] = useState(false);

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // The cookie and current page still preserve the selected theme.
    }

    writePreferenceCookie(THEME_COOKIE, nextTheme);
    applyTheme(nextTheme);
  }, []);

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      setLocaleState(nextLocale);
      document.documentElement.lang = nextLocale;
      writePreferenceCookie(LOCALE_COOKIE, nextLocale);
      router.refresh();
    },
    [router],
  );

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
        const body = await readJsonResponse(response);

        if (!response.ok) {
          return getJsonError(body) ?? translations[locale].stats.errors.login;
        }

        if (!isJsonObject(body) || body.authenticated !== true) {
          return translations[locale].stats.errors.login;
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
      const body = await readJsonResponse(response);

      if (!response.ok) {
        return getJsonError(body) ?? translations[locale].stats.errors.logout;
      }

      if (!isJsonObject(body) || body.authenticated !== false) {
        return translations[locale].stats.errors.logout;
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
        const nextTheme = getStoredTheme(initialTheme);
        setThemeState(nextTheme);
        applyTheme(nextTheme);
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [initialTheme]);

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

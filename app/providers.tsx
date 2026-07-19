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

export type Theme = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const THEME_STORAGE_KEY = 'theme';
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

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

  document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
  document.documentElement.style.colorScheme = resolvedTheme;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used inside Providers.');
  }

  return context;
}

export function Providers({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  }, []);

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
        setThemeState(getStoredTheme());
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [setTheme, theme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

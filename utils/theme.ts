export type Theme = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';
export const THEME_COOKIE = 'streetraceing_theme';

export function getTheme(value: string | null | undefined): Theme {
  return value === 'light' || value === 'dark' || value === 'system'
    ? value
    : 'system';
}

'use client';

import { Button, ButtonGroup, Tooltip } from '@heroui/react';
import { type Theme, useLocale, useTheme } from '@/app/providers';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';

type ThemeSwitcherProps = {
  variant?: 'cycle' | 'group';
};

const subscribeToNothing = () => () => {};

export function ThemeSwitcher({ variant = 'cycle' }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();
  const { copy } = useLocale();
  const themeName: Record<Theme, string> = {
    system: copy.theme.system,
    light: copy.theme.light,
    dark: copy.theme.dark,
  };
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  if (!mounted) {
    if (variant === 'group') {
      return (
        <div
          role="group"
          aria-label={copy.theme.label}
          aria-busy="true"
          className="flex w-full"
        >
          <button
            type="button"
            disabled
            className="button button--tertiary flex-1 rounded-r-none"
          >
            <Monitor className="size-4" />
            {themeName['system']}
          </button>

          <button
            type="button"
            disabled
            className="button button--tertiary -ml-px flex-1 rounded-none"
          >
            <Sun className="size-4" />
            {themeName['light']}
          </button>

          <button
            type="button"
            disabled
            className="button button--tertiary -ml-px flex-1 rounded-l-none"
          >
            <Moon className="size-4" />
            {themeName['dark']}
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        aria-label={copy.theme.label}
        aria-busy="true"
        disabled
        className="button button--icon-only button--tertiary"
      >
        <Monitor className="size-4.5" />
      </button>
    );
  }

  if (variant === 'group') {
    return (
      <ButtonGroup variant="tertiary" fullWidth>
        <Button
          aria-pressed={theme === 'system'}
          type="button"
          variant={theme === 'system' ? 'primary' : 'tertiary'}
          onPress={() => setTheme('system')}
        >
          <Monitor className="size-4" />
          {themeName['system']}
        </Button>

        <Button
          aria-pressed={theme === 'light'}
          type="button"
          variant={theme === 'light' ? 'primary' : 'tertiary'}
          onPress={() => setTheme('light')}
        >
          <Sun className="size-4" />
          <ButtonGroup.Separator />
          {themeName['light']}
        </Button>

        <Button
          aria-pressed={theme === 'dark'}
          type="button"
          variant={theme === 'dark' ? 'primary' : 'tertiary'}
          onPress={() => setTheme('dark')}
        >
          <Moon className="size-4" />
          <ButtonGroup.Separator />
          {themeName['dark']}
        </Button>
      </ButtonGroup>
    );
  }

  const nextTheme =
    theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';

  const Icon = theme === 'system' ? Monitor : theme === 'light' ? Sun : Moon;

  return (
    <Tooltip>
      <Button
        aria-label={`${copy.theme.label}: ${themeName[theme]}. ${themeName[nextTheme]}`}
        isIconOnly
        type="button"
        variant="tertiary"
        onPress={() => setTheme(nextTheme)}
      >
        <Icon className="size-4.5" />
      </Button>

      <Tooltip.Content>
        {themeName[theme as Theme] ?? copy.theme.unknown}{' '}
        {theme !== 'system' ? copy.theme.themeSuffix : ''}
      </Tooltip.Content>
    </Tooltip>
  );
}

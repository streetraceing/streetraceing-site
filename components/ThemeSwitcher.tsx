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
        <ButtonGroup variant="tertiary" fullWidth>
          <Button isDisabled>
            <Monitor className="size-4" />
            <ButtonGroup.Separator />
            {themeName['system']}
          </Button>

          <Button isDisabled>
            <Sun className="size-4" />
            <ButtonGroup.Separator />
            {themeName['light']}
          </Button>

          <Button isDisabled>
            <Moon className="size-4" />
            <ButtonGroup.Separator />
            {themeName['dark']}
          </Button>
        </ButtonGroup>
      );
    }

    return <Button isIconOnly isDisabled variant="tertiary" />;
  }

  if (variant === 'group') {
    return (
      <ButtonGroup variant="tertiary" fullWidth>
        <Button
          variant={theme === 'system' ? 'primary' : 'tertiary'}
          onPress={() => setTheme('system')}
        >
          <Monitor className="size-4" />
          {themeName['system']}
        </Button>

        <Button
          variant={theme === 'light' ? 'primary' : 'tertiary'}
          onPress={() => setTheme('light')}
        >
          <Sun className="size-4" />
          <ButtonGroup.Separator />
          {themeName['light']}
        </Button>

        <Button
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
      <Button isIconOnly variant="tertiary" onPress={() => setTheme(nextTheme)}>
        <Icon className="size-4.5" />
      </Button>

      <Tooltip.Content>
        {themeName[theme as Theme] ?? copy.theme.unknown}{' '}
        {theme != 'system' ? copy.theme.themeSuffix : ''}
      </Tooltip.Content>
    </Tooltip>
  );
}

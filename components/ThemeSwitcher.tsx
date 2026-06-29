'use client';

import { Button, ButtonGroup, Tooltip } from '@heroui/react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

type ThemeSwitcherProps = {
  variant?: 'cycle' | 'group';
};

type Theme = 'system' | 'light' | 'dark';

const themeName: Record<Theme, string> = {
  system: 'Система',
  light: 'Светлая',
  dark: 'Тёмная',
};

export function ThemeSwitcher({ variant = 'cycle' }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
          <ButtonGroup.Separator />
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
        {themeName[theme as Theme] ?? 'Неизвестно'}{' '}
        {theme != 'system' ? 'тема' : ''}
      </Tooltip.Content>
    </Tooltip>
  );
}

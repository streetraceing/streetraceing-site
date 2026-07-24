'use client';

import { Button } from '@/components/ui/Button';
import { useLocale } from '@/app/providers';
import { ButtonGroup } from '@heroui/react';

type LanguageSwitcherProps = {
  fullWidth?: boolean;
};

export function LanguageSwitcher({ fullWidth = false }: LanguageSwitcherProps) {
  const { copy, locale, setLocale } = useLocale();

  return (
    <ButtonGroup
      size="sm"
      variant="tertiary"
      fullWidth={fullWidth}
      aria-label={copy.language.label}
    >
      <Button
        aria-label={copy.language.russian}
        variant={locale === 'ru' ? 'primary' : 'tertiary'}
        onPress={() => setLocale('ru')}
      >
        <span aria-hidden="true">🇷🇺</span>
      </Button>
      <Button
        aria-label={copy.language.english}
        variant={locale === 'en' ? 'primary' : 'tertiary'}
        onPress={() => setLocale('en')}
      >
        <ButtonGroup.Separator />
        <span aria-hidden="true">🇺🇸</span>
      </Button>
    </ButtonGroup>
  );
}

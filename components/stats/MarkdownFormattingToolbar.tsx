'use client';

import { Button } from '@heroui/react';
import { Strikethrough, Underline } from 'lucide-react';
import type { RefObject } from 'react';

import { useLocale } from '@/app/providers';
import { toggleMarkdownDecoration } from '@/utils/markdown';

type MarkdownFormattingToolbarProps = {
  value: string;
  onChange: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
};

export function MarkdownFormattingToolbar({
  value,
  onChange,
  textareaRef,
}: MarkdownFormattingToolbarProps) {
  const { copy } = useLocale();
  const strings = copy.markdownFormatting;

  function applyDecoration(delimiter: '++' | '~~') {
    const textarea = textareaRef.current;
    const selectionStart = textarea?.selectionStart ?? value.length;
    const selectionEnd = textarea?.selectionEnd ?? value.length;
    const update = toggleMarkdownDecoration(
      value,
      selectionStart,
      selectionEnd,
      delimiter,
    );

    onChange(update.value);

    requestAnimationFrame(() => {
      const currentTextarea = textareaRef.current;

      if (!currentTextarea) {
        return;
      }

      currentTextarea.focus();
      currentTextarea.setSelectionRange(
        update.selectionStart,
        update.selectionEnd,
      );
    });
  }

  return (
    <div
      className="flex flex-wrap items-center gap-1"
      role="toolbar"
      aria-label={strings.toolbar}
    >
      <Button
        type="button"
        isIconOnly
        size="sm"
        variant="tertiary"
        aria-label={strings.underline}
        onPress={() => applyDecoration('++')}
      >
        <Underline className="size-4" />
      </Button>
      <Button
        type="button"
        isIconOnly
        size="sm"
        variant="tertiary"
        aria-label={strings.strikethrough}
        onPress={() => applyDecoration('~~')}
      >
        <Strikethrough className="size-4" />
      </Button>
    </div>
  );
}

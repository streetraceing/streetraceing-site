'use client';

import { Button } from '@/components/ui/Button';
import {
  insertMarkdownLink,
  toggleMarkdownDecoration,
  toggleMarkdownLinePrefix,
  wrapMarkdownBlock,
  type MarkdownSelectionUpdate,
} from '@/utils/markdown';
import { ButtonGroup, Toolbar } from '@heroui/react';
import {
  Bold,
  Code,
  Code2,
  Heading2,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Underline,
} from 'lucide-react';
import type { RefObject } from 'react';

import { useLocale } from '@/app/providers';

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

  function getSelection() {
    const textarea = textareaRef.current;

    return {
      selectionStart: textarea?.selectionStart ?? value.length,
      selectionEnd: textarea?.selectionEnd ?? value.length,
    };
  }

  function applyUpdate(update: MarkdownSelectionUpdate) {
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

  function applyInline(delimiter: '++' | '~~' | '**' | '*' | '`') {
    const selection = getSelection();

    applyUpdate(
      toggleMarkdownDecoration(
        value,
        selection.selectionStart,
        selection.selectionEnd,
        delimiter,
      ),
    );
  }

  function applyLinePrefix(prefix: string) {
    const selection = getSelection();

    applyUpdate(
      toggleMarkdownLinePrefix(
        value,
        selection.selectionStart,
        selection.selectionEnd,
        prefix,
      ),
    );
  }

  function applyCodeBlock() {
    const selection = getSelection();

    applyUpdate(
      wrapMarkdownBlock(
        value,
        selection.selectionStart,
        selection.selectionEnd,
        '```\n',
        '\n```',
        strings.codePlaceholder,
      ),
    );
  }

  function applyLink() {
    const selection = getSelection();

    applyUpdate(
      insertMarkdownLink(
        value,
        selection.selectionStart,
        selection.selectionEnd,
        strings.linkTextPlaceholder,
        'https://',
      ),
    );
  }

  return (
    <Toolbar className="flex-wrap gap-1 flex" aria-label={strings.toolbar}>
      <ButtonGroup size="sm" variant="tertiary">
        <Button
          type="button"
          isIconOnly
          aria-label={strings.bold}
          onPress={() => applyInline('**')}
        >
          <Bold className="size-4" />
        </Button>
        <Button
          type="button"
          isIconOnly
          aria-label={strings.italic}
          onPress={() => applyInline('*')}
        >
          <Italic className="size-4" />
        </Button>
        <Button
          type="button"
          isIconOnly
          aria-label={strings.underline}
          onPress={() => applyInline('++')}
        >
          <Underline className="size-4" />
        </Button>
        <Button
          type="button"
          isIconOnly
          aria-label={strings.strikethrough}
          onPress={() => applyInline('~~')}
        >
          <Strikethrough className="size-4" />
        </Button>
        <Button
          type="button"
          isIconOnly
          aria-label={strings.inlineCode}
          onPress={() => applyInline('`')}
        >
          <Code className="size-4" />
        </Button>
      </ButtonGroup>

      <ButtonGroup size="sm" variant="tertiary">
        <Button
          type="button"
          isIconOnly
          aria-label={strings.heading}
          onPress={() => applyLinePrefix('## ')}
        >
          <Heading2 className="size-4" />
        </Button>
        <Button
          type="button"
          isIconOnly
          aria-label={strings.quote}
          onPress={() => applyLinePrefix('> ')}
        >
          <Quote className="size-4" />
        </Button>
        <Button
          type="button"
          isIconOnly
          aria-label={strings.bulletedList}
          onPress={() => applyLinePrefix('- ')}
        >
          <List className="size-4" />
        </Button>
        <Button
          type="button"
          isIconOnly
          aria-label={strings.numberedList}
          onPress={() => applyLinePrefix('1. ')}
        >
          <ListOrdered className="size-4" />
        </Button>
        <Button
          type="button"
          isIconOnly
          aria-label={strings.codeBlock}
          onPress={applyCodeBlock}
        >
          <Code2 className="size-4" />
        </Button>
        <Button
          type="button"
          isIconOnly
          aria-label={strings.link}
          onPress={applyLink}
        >
          <Link className="size-4" />
        </Button>
      </ButtonGroup>
    </Toolbar>
  );
}

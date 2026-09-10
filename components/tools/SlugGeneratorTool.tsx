'use client';

import { Button } from '@/components/ui/Button';
import { useLocale } from '@/app/providers';
import { createSlug } from '@/utils/toolkit';
import {
  Description,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  TextField,
} from '@heroui/react';
import { Type } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ToolOutput } from './ToolOutput';

type SlugSeparator = '-' | '_';

const slugExample = 'Мои заметки: дизайн и код';

export function SlugGeneratorTool() {
  const { copy } = useLocale();
  const strings = copy.tools.slug;
  const [source, setSource] = useState('');
  const [separator, setSeparator] = useState<SlugSeparator>('-');
  const slug = useMemo(
    () => createSlug(source, separator),
    [separator, source],
  );

  return (
    <div className="flex flex-col gap-4">
      <Form
        className="flex flex-col gap-4"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <TextField
            fullWidth
            name="slug-source"
            value={source}
            onChange={setSource}
          >
            <Label>{strings.label}</Label>
            <Input
              variant="secondary"
              spellCheck={false}
              placeholder={strings.placeholder}
            />
            <Description>{strings.description}</Description>
          </TextField>

          <Select
            value={separator}
            variant="secondary"
            onChange={(value) => {
              if (value === '-' || value === '_') {
                setSeparator(value);
              }
            }}
          >
            <Label>{strings.separator}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="-" textValue={strings.separatorDash}>
                  {strings.separatorDash}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="_" textValue={strings.separatorUnderscore}>
                  {strings.separatorUnderscore}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        <Button
          type="button"
          variant="tertiary"
          className="self-start"
          onPress={() => setSource(slugExample)}
        >
          {strings.example}
        </Button>
      </Form>

      {slug ? (
        <ToolOutput content={slug} label={strings.output} format="plain" />
      ) : null}
    </div>
  );
}

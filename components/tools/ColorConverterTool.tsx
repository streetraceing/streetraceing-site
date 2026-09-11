'use client';

import { useLocale } from '@/app/providers';
import { getColorFormats, normalizeHexColor } from '@/utils/toolkit';
import { Description, Form, Input, Label, TextField } from '@heroui/react';
import { useMemo, useState } from 'react';

import { ErrorAlert } from './ErrorAlert';
import { ToolOutput } from './ToolOutput';

export function ColorConverterTool() {
  const { copy } = useLocale();
  const strings = copy.tools.colorConverter;
  const [source, setSource] = useState('#4C9AFF');
  const formats = useMemo(() => getColorFormats(source), [source]);
  const previewColor = normalizeHexColor(source) ?? '#FFFFFF';

  const output = formats
    ? [
        `${strings.hex}: ${formats.hex}`,
        `${strings.rgbCss}: ${formats.rgbCss}`,
        `${strings.hslCss}: ${formats.hslCss}`,
      ].join('\n')
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      <Form
        className="flex flex-col gap-4"
        onSubmit={(event) => event.preventDefault()}
      >
        <TextField
          fullWidth
          name="color-hex"
          value={source}
          onChange={setSource}
        >
          <Label>{strings.label}</Label>
          <Input variant="secondary" spellCheck={false} placeholder="#4C9AFF" />
          <Description>{strings.hexHint}</Description>
        </TextField>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="color"
              value={previewColor}
              onChange={(event) =>
                setSource(event.currentTarget.value.toUpperCase())
              }
              className="size-10 cursor-pointer rounded border bg-transparent"
            />
            {strings.picker}
          </label>
          <span
            aria-hidden="true"
            title={strings.preview}
            className="size-10 rounded-lg border shadow-sm"
            style={{ backgroundColor: previewColor }}
          />
        </div>
      </Form>

      {source.trim() && !formats ? (
        <ErrorAlert title={strings.errorTitle} message={strings.invalid} />
      ) : null}

      {formats && output ? (
        <ToolOutput
          content={output}
          label={strings.output}
          format="key-value"
        />
      ) : null}
    </div>
  );
}

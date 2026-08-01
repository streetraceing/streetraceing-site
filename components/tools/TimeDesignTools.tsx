'use client';

import { useLocale } from '@/app/providers';
import { Button } from '@/components/ui/Button';
import { getLocaleTag } from '@/utils/i18n';
import {
  buildCronExpression,
  getColorContrast,
  normalizeHexColor,
} from '@/utils/toolkit';
import {
  Alert,
  Card,
  Chip,
  Description,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  TextField,
  Typography,
} from '@heroui/react';
import { CalendarClock, Clock3, RefreshCw } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';

import { ToolOutput } from './ToolOutput';

type CronFrequency =
  'hourly' | 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'monthly';

function ErrorAlert({ title, message }: { title: string; message: string }) {
  return (
    <Alert status="danger">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

function parseTimestampValue(value: string) {
  const trimmed = value.trim();

  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    const numeric = Number(trimmed);

    if (!Number.isFinite(numeric)) {
      return undefined;
    }

    return new Date(
      Math.abs(numeric) >= 100_000_000_000 ? numeric : numeric * 1000,
    );
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function TimestampConverterTool() {
  const { copy, locale } = useLocale();
  const strings = copy.tools.timestamp;
  const [source, setSource] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string>();

  function convert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const date = parseTimestampValue(source);

    if (!date) {
      setOutput('');
      setError(strings.invalid);
      return;
    }

    const milliseconds = date.getTime();
    setOutput(
      [
        `${strings.iso}: ${date.toISOString()}`,
        `${strings.local}: ${date.toLocaleString(getLocaleTag(locale))}`,
        `${strings.unixSeconds}: ${Math.trunc(milliseconds / 1000)}`,
        `${strings.unixMilliseconds}: ${milliseconds}`,
        `${strings.utc}: ${date.toUTCString()}`,
      ].join('\n'),
    );
    setError(undefined);
  }

  function useNow() {
    const now = Date.now();
    setSource(String(now));
    setOutput('');
    setError(undefined);
  }

  return (
    <div className="flex flex-col gap-4">
      <Form className="flex flex-col gap-4" onSubmit={convert}>
        <TextField
          fullWidth
          name="timestamp"
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
        <div className="flex flex-wrap gap-2">
          <Button type="submit">
            <Clock3 />
            {strings.convert}
          </Button>
          <Button type="button" variant="secondary" onPress={useNow}>
            <RefreshCw />
            {strings.now}
          </Button>
        </div>
      </Form>

      {error ? <ErrorAlert title={strings.errorTitle} message={error} /> : null}
      {output ? (
        <ToolOutput
          content={output}
          label={strings.output}
          format="key-value"
        />
      ) : null}
    </div>
  );
}

function ResultChip({ passed, label }: { passed: boolean; label: string }) {
  return (
    <Chip color={passed ? 'success' : 'danger'} variant="soft" size="sm">
      {label}: {passed ? '✓' : '×'}
    </Chip>
  );
}

export function ColorContrastTool() {
  const { copy } = useLocale();
  const strings = copy.tools.contrast;
  const [foreground, setForeground] = useState('#FFFFFF');
  const [background, setBackground] = useState('#111827');
  const result = useMemo(
    () => getColorContrast(foreground, background),
    [background, foreground],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          fullWidth
          name="foreground"
          value={foreground}
          onChange={setForeground}
        >
          <Label>{strings.foreground}</Label>
          <Input variant="secondary" spellCheck={false} />
          <Description>{strings.hexHint}</Description>
        </TextField>
        <TextField
          fullWidth
          name="background"
          value={background}
          onChange={setBackground}
        >
          <Label>{strings.background}</Label>
          <Input variant="secondary" spellCheck={false} />
          <Description>{strings.hexHint}</Description>
        </TextField>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="color"
            value={normalizeHexColor(foreground) ?? '#FFFFFF'}
            onChange={(event) =>
              setForeground(event.currentTarget.value.toUpperCase())
            }
            className="size-10 cursor-pointer rounded border bg-transparent"
          />
          {strings.foregroundPicker}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="color"
            value={normalizeHexColor(background) ?? '#111827'}
            onChange={(event) =>
              setBackground(event.currentTarget.value.toUpperCase())
            }
            className="size-10 cursor-pointer rounded border bg-transparent"
          />
          {strings.backgroundPicker}
        </label>
      </div>

      {result ? (
        <>
          <Card variant="secondary">
            <Card.Content>
              <div
                className="rounded-xl border p-6"
                style={
                  {
                    '--foreground': result.foreground,
                    backgroundColor: result.background,
                  } as React.CSSProperties
                }
              >
                <Typography.Heading level={3}>
                  {strings.previewTitle}
                </Typography.Heading>
                <Typography.Paragraph>
                  {strings.previewText}
                </Typography.Paragraph>
              </div>
            </Card.Content>
          </Card>

          <div className="flex flex-col gap-3">
            <Typography.Heading level={3} className="text-lg">
              {strings.ratio.replace('{ratio}', result.ratio.toFixed(2))}
            </Typography.Heading>
            <div className="flex flex-wrap gap-2">
              <ResultChip passed={result.normalAA} label={strings.normalAA} />
              <ResultChip passed={result.normalAAA} label={strings.normalAAA} />
              <ResultChip passed={result.largeAA} label={strings.largeAA} />
              <ResultChip passed={result.largeAAA} label={strings.largeAAA} />
            </div>
          </div>
        </>
      ) : (
        <ErrorAlert title={strings.errorTitle} message={strings.invalid} />
      )}
    </div>
  );
}

const cronFrequencies: CronFrequency[] = [
  'hourly',
  'daily',
  'weekdays',
  'weekends',
  'weekly',
  'monthly',
];

export function CronBuilderTool() {
  const { copy } = useLocale();
  const strings = copy.tools.cron;
  const [frequency, setFrequency] = useState<CronFrequency>('daily');
  const [minute, setMinute] = useState('0');
  const [hour, setHour] = useState('9');
  const [weekday, setWeekday] = useState('1');
  const [monthDay, setMonthDay] = useState('1');
  const [output, setOutput] = useState('');

  function build(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const expression = buildCronExpression({
      frequency,
      minute: Number(minute),
      hour: Number(hour),
      weekday: Number(weekday),
      monthDay: Number(monthDay),
    });
    const time = `${String(Math.min(23, Math.max(0, Number(hour) || 0))).padStart(2, '0')}:${String(Math.min(59, Math.max(0, Number(minute) || 0))).padStart(2, '0')}`;
    const description = strings.descriptions[frequency]
      .replace('{time}', time)
      .replace(
        '{minute}',
        String(Math.min(59, Math.max(0, Number(minute) || 0))),
      )
      .replace(
        '{weekday}',
        strings.weekdays[Math.min(6, Math.max(0, Number(weekday) || 0))] ?? '',
      )
      .replace(
        '{day}',
        String(Math.min(31, Math.max(1, Number(monthDay) || 1))),
      );

    setOutput(`${expression}\n\n${description}\n${strings.timezoneNote}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <Form className="flex flex-col gap-4" onSubmit={build}>
        <Select
          value={frequency}
          onChange={(value) => {
            if (
              typeof value === 'string' &&
              cronFrequencies.includes(value as CronFrequency)
            ) {
              setFrequency(value as CronFrequency);
            }
          }}
        >
          <Label>{strings.frequency}</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {cronFrequencies.map((value) => (
                <ListBox.Item
                  key={value}
                  id={value}
                  textValue={strings.frequencies[value]}
                >
                  {strings.frequencies[value]}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            fullWidth
            name="cron-minute"
            value={minute}
            onChange={setMinute}
          >
            <Label>{strings.minute}</Label>
            <Input type="number" min={0} max={59} variant="secondary" />
          </TextField>
          {frequency !== 'hourly' ? (
            <TextField
              fullWidth
              name="cron-hour"
              value={hour}
              onChange={setHour}
            >
              <Label>{strings.hour}</Label>
              <Input type="number" min={0} max={23} variant="secondary" />
            </TextField>
          ) : null}
        </div>

        {frequency === 'weekly' ? (
          <Select
            value={weekday}
            onChange={(value) => typeof value === 'string' && setWeekday(value)}
          >
            <Label>{strings.weekday}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {strings.weekdays.map((label, index) => (
                  <ListBox.Item
                    key={label}
                    id={String(index)}
                    textValue={label}
                  >
                    {label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        ) : null}

        {frequency === 'monthly' ? (
          <TextField
            fullWidth
            name="month-day"
            value={monthDay}
            onChange={setMonthDay}
          >
            <Label>{strings.monthDay}</Label>
            <Input type="number" min={1} max={31} variant="secondary" />
            <Description>{strings.monthDayHint}</Description>
          </TextField>
        ) : null}

        <Button type="submit" className="self-start">
          <CalendarClock />
          {strings.build}
        </Button>
      </Form>

      {output ? (
        <ToolOutput content={output} label={strings.output} format="cron" />
      ) : null}
    </div>
  );
}

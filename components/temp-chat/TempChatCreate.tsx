'use client';

import { useLocale } from '@/app/providers';
import { ErrorAlert } from '@/components/tools/ErrorAlert';
import { ToolPageFrame } from '@/components/tools/ToolPageFrame';
import { Button } from '@/components/ui/Button';
import { getJsonError, isJsonObject, readJsonResponse } from '@/utils/json';
import { getLocaleTag, getText } from '@/utils/i18n';
import { getToolBySlug } from '@/utils/tool-catalog';
import {
  isTempChatHistoryEntry,
  isTempChatTtlHours,
  mergeTempChatHistoryEntry,
  pruneExpiredTempChatHistory,
  TEMP_CHAT_HISTORY_STORAGE_KEY,
  TEMP_CHAT_TTL_HOURS,
  type TempChatHistoryEntry,
} from '@/utils/temp-chat';
import {
  Description,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  TextField,
  Typography,
} from '@heroui/react';
import { ArrowUpRight, MessagesSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type FormEvent, useState, useSyncExternalStore } from 'react';

const subscribeToNothing = () => () => {};

function readHistory(): TempChatHistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(TEMP_CHAT_HISTORY_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return pruneExpiredTempChatHistory(parsed.filter(isTempChatHistoryEntry));
  } catch {
    return [];
  }
}

function writeHistory(entries: TempChatHistoryEntry[]) {
  try {
    window.localStorage.setItem(
      TEMP_CHAT_HISTORY_STORAGE_KEY,
      JSON.stringify(entries),
    );
  } catch {
    // History is a convenience feature; failures are safe to ignore.
  }
}

function getHistorySnapshot() {
  return pruneExpiredTempChatHistory(readHistory());
}

function getServerHistorySnapshot(): TempChatHistoryEntry[] {
  return [];
}

export function TempChatCreate() {
  const { copy, locale } = useLocale();
  const strings = copy.tempChat;
  const localeTag = getLocaleTag(locale);
  const router = useRouter();
  const tool = getToolBySlug('temp-chat');
  const [title, setTitle] = useState('');
  const [ttlHours, setTtlHours] = useState<number>(24);
  const [password, setPassword] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string>();
  const history = useSyncExternalStore(
    subscribeToNothing,
    getHistorySnapshot,
    getServerHistorySnapshot,
  );

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(undefined);

    try {
      const response = await fetch('/api/temp-chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          ttlHours,
          password: password || undefined,
        }),
      });
      const body = await readJsonResponse(response);
      const code =
        isJsonObject(body) && typeof body.code === 'string'
          ? body.code
          : undefined;
      const expiresAt =
        isJsonObject(body) && typeof body.expiresAt === 'string'
          ? body.expiresAt
          : undefined;

      if (!response.ok || !code || !expiresAt) {
        throw new Error(getJsonError(body) ?? strings.createFailed);
      }

      const nextHistory = mergeTempChatHistoryEntry(readHistory(), {
        code,
        title: title.trim(),
        expiresAt,
        isOwner: true,
        joinedAt: new Date().toISOString(),
      });

      writeHistory(nextHistory);
      router.push(`/tools/chat/${code}`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : strings.createFailed,
      );
      setIsPending(false);
    }
  }

  return (
    <ToolPageFrame
      title={tool ? getText(tool.name, locale) : strings.create}
      description={
        tool ? getText(tool.description, locale) : strings.passwordHint
      }
      icon={<MessagesSquare className="size-6" />}
    >
      <div className="flex flex-col gap-4">
        <Form
          className="flex flex-col gap-4"
          onSubmit={(event) => void create(event)}
        >
          <TextField
            fullWidth
            name="temp-chat-title"
            value={title}
            onChange={setTitle}
            validate={(value) =>
              value.trim().length > 0 ? null : strings.titleRequired
            }
            isRequired
          >
            <Label>{strings.titleLabel}</Label>
            <Input variant="secondary" placeholder={strings.titlePlaceholder} />
          </TextField>

          <Select
            value={String(ttlHours)}
            variant="secondary"
            onChange={(value) => {
              const parsed = Number(value);

              if (isTempChatTtlHours(parsed)) {
                setTtlHours(parsed);
              }
            }}
          >
            <Label>{strings.ttlLabel}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {TEMP_CHAT_TTL_HOURS.map((hours) => (
                  <ListBox.Item
                    key={hours}
                    id={String(hours)}
                    textValue={strings.ttlOptions[hours]}
                  >
                    {strings.ttlOptions[hours]}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <TextField
            fullWidth
            name="temp-chat-password"
            value={password}
            onChange={setPassword}
          >
            <Label>{strings.passwordLabel}</Label>
            <Input
              type="password"
              variant="secondary"
              autoComplete="new-password"
            />
            <Description>{strings.passwordHint}</Description>
          </TextField>

          <Button type="submit" isPending={isPending} className="self-start">
            {strings.create}
          </Button>
        </Form>

        {error ? (
          <ErrorAlert title={strings.createFailed} message={error} />
        ) : null}

        <section
          className="flex flex-col gap-3"
          aria-labelledby="temp-chat-history-heading"
        >
          <Typography.Heading id="temp-chat-history-heading" level={2}>
            {strings.myChatsTitle}
          </Typography.Heading>

          {history.length === 0 ? (
            <div className="rounded-xl border bg-surface-secondary/45 px-4 py-3 text-sm text-muted">
              {strings.myChatsEmpty}
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {history.map((entry) => (
                <li key={entry.code}>
                  <Link
                    href={`/tools/chat/${entry.code}`}
                    className="group flex items-center justify-between gap-3 rounded-xl border bg-surface-secondary/45 px-4 py-3 no-underline transition-colors hover:bg-surface-tertiary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-sm font-medium">
                        {entry.title}
                      </span>
                      <span className="text-xs text-muted">
                        {strings.expiresNote.replace(
                          '{time}',
                          new Date(entry.expiresAt).toLocaleString(localeTag),
                        )}
                      </span>
                    </span>
                    <ArrowUpRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </ToolPageFrame>
  );
}

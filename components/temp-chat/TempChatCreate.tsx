'use client';

import { useLocale } from '@/app/providers';
import { ErrorAlert } from '@/components/tools/ErrorAlert';
import { ToolPageFrame } from '@/components/tools/ToolPageFrame';
import { Button } from '@/components/ui/Button';
import { getJsonError, isJsonObject, readJsonResponse } from '@/utils/json';
import { getText } from '@/utils/i18n';
import { getToolBySlug } from '@/utils/tool-catalog';
import { isTempChatTtlHours, TEMP_CHAT_TTL_HOURS } from '@/utils/temp-chat';
import {
  Description,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  TextField,
} from '@heroui/react';
import { MessagesSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

export function TempChatCreate() {
  const { copy, locale } = useLocale();
  const strings = copy.tempChat;
  const router = useRouter();
  const tool = getToolBySlug('temp-chat');
  const [title, setTitle] = useState('');
  const [ttlHours, setTtlHours] = useState<number>(24);
  const [password, setPassword] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string>();

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

      if (!response.ok || !code) {
        throw new Error(getJsonError(body) ?? strings.createFailed);
      }

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
      </div>
    </ToolPageFrame>
  );
}

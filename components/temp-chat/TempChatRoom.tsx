'use client';

import { useLocale } from '@/app/providers';
import { ErrorAlert } from '@/components/tools/ErrorAlert';
import { ToolPageFrame } from '@/components/tools/ToolPageFrame';
import { Button } from '@/components/ui/Button';
import { getJsonError, isJsonObject, readJsonResponse } from '@/utils/json';
import { getLocaleTag } from '@/utils/i18n';
import {
  formatTempChatFileSize,
  isTempChatAuthorNameValid,
  normalizeTempChatAuthorName,
  TEMP_CHAT_MAX_MESSAGE_LENGTH,
} from '@/utils/temp-chat';
import {
  AlertDialog,
  Form,
  Input,
  Label,
  Spinner,
  TextArea,
  TextField,
  Typography,
} from '@heroui/react';
import {
  Download,
  FileText,
  MessagesSquare,
  Paperclip,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

type ChatMeta = {
  title: string;
  expiresAt: string;
  requiresPassword: boolean;
  isOwner: boolean;
};

type ChatMessageFile = {
  name: string;
  size: number;
  type?: string;
};

type ChatMessage = {
  id: string;
  memberId: string;
  authorName: string;
  content?: string;
  createdAt: string;
  file?: ChatMessageFile;
};

type StoredMember = {
  token: string;
  memberId: string;
  name: string;
};

type RoomState = 'loading' | 'gate' | 'room' | 'missing';

const POLL_INTERVAL_MS = 4_000;

function tokenStorageKey(code: string) {
  return `temp-chat-token:${code}`;
}

const MEMBER_NAME_STORAGE_KEY = 'temp-chat-name';

function readStoredMember(code: string): StoredMember | undefined {
  try {
    const raw = window.localStorage.getItem(tokenStorageKey(code));

    if (!raw) {
      return undefined;
    }

    const parsed: unknown = JSON.parse(raw);

    return isJsonObject(parsed) &&
      typeof parsed.token === 'string' &&
      typeof parsed.memberId === 'string' &&
      typeof parsed.name === 'string'
      ? { token: parsed.token, memberId: parsed.memberId, name: parsed.name }
      : undefined;
  } catch {
    return undefined;
  }
}

function isChatMessage(value: unknown): value is ChatMessage {
  return (
    isJsonObject(value) &&
    typeof value.id === 'string' &&
    typeof value.memberId === 'string' &&
    typeof value.authorName === 'string' &&
    typeof value.createdAt === 'string'
  );
}

function deriveDefaultDeviceName() {
  if (typeof navigator === 'undefined') {
    return '';
  }

  const userAgent = navigator.userAgent;
  const platform = /Android/i.test(userAgent)
    ? 'Android'
    : /iPhone|iPad|iPod/i.test(userAgent)
      ? 'iOS'
      : /Windows/i.test(userAgent)
        ? 'Windows'
        : /Mac OS X/i.test(userAgent)
          ? 'macOS'
          : /Linux/i.test(userAgent)
            ? 'Linux'
            : 'Device';
  const browser = /Edg\//i.test(userAgent)
    ? 'Edge'
    : /OPR\//i.test(userAgent)
      ? 'Opera'
      : /Chrome\//i.test(userAgent)
        ? 'Chrome'
        : /Firefox\//i.test(userAgent)
          ? 'Firefox'
          : /Safari\//i.test(userAgent)
            ? 'Safari'
            : 'Browser';

  return `${browser} · ${platform}`;
}

export function TempChatRoom({ code }: { code: string }) {
  const { copy, locale } = useLocale();
  const strings = copy.tempChat;
  const localeTag = getLocaleTag(locale);
  const router = useRouter();
  const [state, setState] = useState<RoomState>('loading');
  const [meta, setMeta] = useState<ChatMeta>();
  const [error, setError] = useState<string>();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [memberId, setMemberId] = useState<string>();
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File>();
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastCreatedAtRef = useRef<string | undefined>(undefined);

  const getStoredToken = useCallback(() => {
    const stored = readStoredMember(code);
    return stored?.token;
  }, [code]);

  const applyMessages = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) {
      return;
    }

    setMessages((current) => {
      const seen = new Set(current.map((message) => message.id));
      const merged = [
        ...current,
        ...incoming.filter((message) => !seen.has(message.id)),
      ].sort((first, second) =>
        first.createdAt.localeCompare(second.createdAt),
      );
      const lastMessage = merged[merged.length - 1];

      if (lastMessage) {
        lastCreatedAtRef.current = lastMessage.createdAt;
      }

      return merged;
    });
  }, []);

  const loadMessages = useCallback(
    async (token: string, after?: string) => {
      const query = after ? `?after=${encodeURIComponent(after)}` : '';
      const response = await fetch(`/api/temp-chats/${code}/messages${query}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const body = await readJsonResponse(response);

      if (response.status === 401) {
        window.localStorage.removeItem(tokenStorageKey(code));
        setState('gate');
        setError(strings.sessionExpired);
        return;
      }

      if (
        !response.ok ||
        !isJsonObject(body) ||
        !Array.isArray(body.messages)
      ) {
        setError(getJsonError(body) ?? strings.loadFailed);
        return;
      }

      applyMessages(body.messages.filter(isChatMessage));
    },
    [applyMessages, code, strings.loadFailed, strings.sessionExpired],
  );

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const metaResponse = await fetch(`/api/temp-chats/${code}`, {
          cache: 'no-store',
        });
        const metaBody = await readJsonResponse(metaResponse);

        if (!active) {
          return;
        }

        if (metaResponse.status === 404 || !isJsonObject(metaBody)) {
          setState('missing');
          return;
        }

        if (
          typeof metaBody.title !== 'string' ||
          typeof metaBody.expiresAt !== 'string'
        ) {
          setState('gate');
          setError(strings.loadFailed);
          return;
        }

        setMeta({
          title: metaBody.title,
          expiresAt: metaBody.expiresAt,
          requiresPassword: Boolean(metaBody.requiresPassword),
          isOwner: Boolean(metaBody.isOwner),
        });

        const stored = readStoredMember(code);

        if (stored) {
          setMemberId(stored.memberId);
          await loadMessages(stored.token);
          setState('room');
          return;
        }

        setName(
          window.localStorage.getItem(MEMBER_NAME_STORAGE_KEY) ??
            deriveDefaultDeviceName(),
        );
        setState('gate');
      } catch {
        if (active) {
          setState('gate');
          setError(strings.loadFailed);
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [code, loadMessages, strings.loadFailed]);

  useEffect(() => {
    if (state !== 'room') {
      return;
    }

    let cancelled = false;

    async function poll() {
      if (document.visibilityState !== 'visible' || cancelled) {
        return;
      }

      const token = getStoredToken();

      if (!token) {
        return;
      }

      const after = lastCreatedAtRef.current;

      try {
        await loadMessages(token, after);
      } catch {
        // Transient network errors are skipped until the next poll.
      }
    }

    const interval = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    const onVisibilityChange = () => void poll();

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [code, getStoredToken, loadMessages, state]);

  useEffect(() => {
    const list = listRef.current;

    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages.length]);

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsJoining(true);
    setError(undefined);

    try {
      const response = await fetch(`/api/temp-chats/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          password: password || undefined,
        }),
      });
      const body = await readJsonResponse(response);
      const token =
        isJsonObject(body) && typeof body.token === 'string'
          ? body.token
          : undefined;
      const member = isJsonObject(body) ? body.member : undefined;

      if (!response.ok || !token || !isJsonObject(member)) {
        throw new Error(getJsonError(body) ?? strings.joinFailed);
      }

      if (
        typeof member.id !== 'string' ||
        typeof member.name !== 'string' ||
        !isTempChatAuthorNameValid(member.name)
      ) {
        throw new Error(strings.joinFailed);
      }

      const storedMember: StoredMember = {
        token,
        memberId: member.id,
        name: member.name,
      };

      window.localStorage.setItem(
        tokenStorageKey(code),
        JSON.stringify(storedMember),
      );
      window.localStorage.setItem(
        MEMBER_NAME_STORAGE_KEY,
        normalizeTempChatAuthorName(name),
      );
      setMemberId(member.id);
      await loadMessages(token);
      setState('room');
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : strings.joinFailed,
      );
    } finally {
      setIsJoining(false);
    }
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.currentTarget.files?.[0]);
  }

  function clearFile() {
    setFile(undefined);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getStoredToken();

    if (!token) {
      setState('gate');
      return;
    }

    const hasContent = content.trim().length > 0;

    if (!hasContent && !file) {
      return;
    }

    if (content.length > TEMP_CHAT_MAX_MESSAGE_LENGTH) {
      setError(strings.messageTooLong);
      return;
    }

    setIsSending(true);
    setError(undefined);

    try {
      let filePayload:
        { key: string; name: string; size: number; type: string } | undefined;

      if (file) {
        setIsUploading(true);

        const authorizeResponse = await fetch(
          `/api/temp-chats/${code}/upload-authorize`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: file.name,
              size: file.size,
              type: file.type,
            }),
          },
        );
        const authorizeBody = await readJsonResponse(authorizeResponse);

        if (
          !authorizeResponse.ok ||
          !isJsonObject(authorizeBody) ||
          typeof authorizeBody.uploadUrl !== 'string' ||
          typeof authorizeBody.key !== 'string' ||
          typeof authorizeBody.fileName !== 'string' ||
          typeof authorizeBody.contentDisposition !== 'string'
        ) {
          throw new Error(getJsonError(authorizeBody) ?? strings.uploadFailed);
        }

        const putResponse = await fetch(authorizeBody.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'content-disposition': authorizeBody.contentDisposition,
          },
        });

        if (!putResponse.ok) {
          throw new Error(strings.uploadFailed);
        }

        filePayload = {
          key: authorizeBody.key,
          name: authorizeBody.fileName,
          size: file.size,
          type: file.type || 'application/octet-stream',
        };
        setIsUploading(false);
      }

      const messageResponse = await fetch(`/api/temp-chats/${code}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(filePayload ? { file: filePayload } : { content }),
      });
      const messageBody = await readJsonResponse(messageResponse);
      const message = isJsonObject(messageBody)
        ? messageBody.message
        : undefined;

      if (!messageResponse.ok || !isChatMessage(message)) {
        throw new Error(getJsonError(messageBody) ?? strings.sendFailed);
      }

      applyMessages([message]);
      setContent('');
      clearFile();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : strings.sendFailed,
      );
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  }

  async function downloadFile(message: ChatMessage) {
    const token = getStoredToken();

    if (!token) {
      return;
    }

    try {
      const response = await fetch(`/api/temp-chats/${code}/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messageId: message.id }),
      });
      const body = await readJsonResponse(response);
      const url =
        isJsonObject(body) && typeof body.url === 'string'
          ? body.url
          : undefined;

      if (!response.ok || !url) {
        throw new Error(getJsonError(body) ?? strings.linkFailed);
      }

      const anchor = document.createElement('a');

      anchor.href = url;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : strings.linkFailed,
      );
    }
  }

  async function deleteChat(close: () => void) {
    setIsDeleting(true);
    setError(undefined);

    try {
      const response = await fetch(`/api/temp-chats/${code}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const body = await readJsonResponse(response);

        throw new Error(getJsonError(body) ?? strings.deleteFailed);
      }

      window.localStorage.removeItem(tokenStorageKey(code));
      close();
      router.push('/tools');
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : strings.deleteFailed,
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const frameTitle = meta?.title ?? strings.gateTitle;
  const frameDescription = meta
    ? strings.expiresNote.replace(
        '{time}',
        new Date(meta.expiresAt).toLocaleString(localeTag),
      )
    : strings.gateDescription;

  return (
    <ToolPageFrame
      title={frameTitle}
      description={frameDescription}
      icon={<MessagesSquare className="size-6" />}
    >
      {state === 'loading' ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : null}

      {state === 'missing' ? (
        <ErrorAlert title={strings.roomNotFound} message={strings.expired} />
      ) : null}

      {state === 'gate' ? (
        <div className="flex flex-col gap-4">
          {error ? (
            <ErrorAlert title={strings.joinFailed} message={error} />
          ) : null}

          <Typography.Paragraph className="text-sm text-muted">
            {strings.gateDescription}
          </Typography.Paragraph>

          <Form
            className="flex flex-col gap-4"
            onSubmit={(event) => void join(event)}
          >
            <TextField
              isRequired
              fullWidth
              name="temp-chat-name"
              value={name}
              onChange={setName}
              validate={(value) =>
                isTempChatAuthorNameValid(value) ? null : strings.nameRequired
              }
            >
              <Label>{strings.nameLabel}</Label>
              <Input
                variant="secondary"
                placeholder={strings.namePlaceholder}
              />
            </TextField>

            {meta?.requiresPassword ? (
              <TextField
                isRequired
                fullWidth
                name="temp-chat-gate-password"
                value={password}
                onChange={setPassword}
              >
                <Label>{strings.gatePasswordLabel}</Label>
                <Input type="password" variant="secondary" autoComplete="off" />
              </TextField>
            ) : null}

            <Button type="submit" isPending={isJoining} className="self-start">
              {strings.join}
            </Button>
          </Form>
        </div>
      ) : null}

      {state === 'room' ? (
        <div className="flex flex-col gap-4">
          {error ? (
            <ErrorAlert title={strings.sendFailed} message={error} />
          ) : null}

          <div
            ref={listRef}
            className="flex max-h-[28rem] min-h-40 flex-col gap-3 overflow-y-auto rounded-2xl border bg-surface-secondary/45 p-4"
          >
            {messages.length === 0 ? (
              <Typography.Paragraph className="text-sm text-muted">
                {strings.empty}
              </Typography.Paragraph>
            ) : (
              <ul className="flex flex-col gap-3">
                {messages.map((message) => {
                  const isOwn = message.memberId === memberId;

                  return (
                    <li
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`flex max-w-[85%] flex-col gap-1.5 rounded-2xl px-3.5 py-2.5 ${
                          isOwn
                            ? 'bg-accent-soft text-accent-soft-foreground'
                            : 'bg-surface-tertiary'
                        }`}
                      >
                        <span className="text-xs font-medium opacity-80">
                          {isOwn ? strings.you : message.authorName} ·{' '}
                          {new Date(message.createdAt).toLocaleTimeString(
                            localeTag,
                            { hour: '2-digit', minute: '2-digit' },
                          )}
                        </span>

                        {message.content ? (
                          <Typography.Paragraph
                            size="sm"
                            className="whitespace-pre-wrap wrap-break-word"
                          >
                            {message.content}
                          </Typography.Paragraph>
                        ) : null}

                        {message.file ? (
                          <Button
                            type="button"
                            size="sm"
                            variant={isOwn ? 'secondary' : 'tertiary'}
                            onPress={() => void downloadFile(message)}
                          >
                            <Download className="size-4" />
                            {message.file.name} (
                            {formatTempChatFileSize(message.file.size, locale)})
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {meta?.isOwner ? (
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="tertiary"
                className="text-danger"
                onPress={() => setIsDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                {strings.deleteChat}
              </Button>
            </div>
          ) : null}

          <Form
            className="flex flex-col gap-3"
            onSubmit={(event) => void send(event)}
          >
            {file ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border bg-surface-secondary px-3 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <FileText className="size-4 shrink-0 text-muted" />
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0 text-muted">
                    {formatTempChatFileSize(file.size, locale)}
                  </span>
                </span>
                <Button
                  type="button"
                  isIconOnly
                  size="sm"
                  variant="tertiary"
                  aria-label={strings.cancel}
                  onPress={clearFile}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : null}

            <TextField
              fullWidth
              name="temp-chat-message"
              value={content}
              onChange={setContent}
            >
              <Label className="sr-only">{strings.placeholder}</Label>
              <TextArea
                rows={3}
                variant="secondary"
                placeholder={strings.placeholder}
                maxLength={TEMP_CHAT_MAX_MESSAGE_LENGTH}
              />
            </TextField>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                onChange={selectFile}
              />
              <Button
                type="button"
                variant="secondary"
                onPress={() => fileInputRef.current?.click()}
              >
                <Paperclip className="size-4" />
                {strings.attach}
              </Button>
              <Button type="submit" isPending={isSending}>
                <Send className="size-4" />
                {strings.send}
              </Button>
              <span className="ml-auto text-xs text-muted">
                {content.length.toLocaleString(localeTag)} /{' '}
                {TEMP_CHAT_MAX_MESSAGE_LENGTH.toLocaleString(localeTag)}
              </span>
            </div>

            {isUploading ? (
              <Typography.Paragraph size="sm" className="text-muted">
                {strings.uploading}
              </Typography.Paragraph>
            ) : null}
          </Form>
        </div>
      ) : null}

      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={isDeleteOpen}
          variant="blur"
          onOpenChange={setIsDeleteOpen}
        >
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog className="w-[calc(100vw-2rem)] sm:max-w-md">
              {({ close }) => (
                <>
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header>
                    <AlertDialog.Icon status="danger" />
                    <AlertDialog.Heading>
                      {strings.deleteChatTitle}
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    {strings.deleteChatDescription}
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button slot="close" variant="tertiary" onPress={close}>
                      {strings.cancel}
                    </Button>
                    <Button
                      slot="close"
                      variant="danger"
                      isPending={isDeleting}
                      onPress={() => void deleteChat(close)}
                    >
                      <Trash2 className="size-4" />
                      {strings.deleteChat}
                    </Button>
                  </AlertDialog.Footer>
                </>
              )}
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </ToolPageFrame>
  );
}

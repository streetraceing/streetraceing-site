'use client';

import { useLocale } from '@/app/providers';
import { MediaGallery } from '@/components/media/MediaGallery';
import { useTransientValue } from '@/components/hooks/useTransientValue';
import { ErrorAlert } from '@/components/tools/ErrorAlert';
import { ToolPageFrame } from '@/components/tools/ToolPageFrame';
import { Button } from '@/components/ui/Button';
import { getJsonError, isJsonObject, readJsonResponse } from '@/utils/json';
import { getLocaleTag } from '@/utils/i18n';
import {
  formatTempChatFileSize,
  getTempChatInitials,
  getTempChatMemberTone,
  isTempChatAuthorNameValid,
  isTempChatHistoryEntry,
  isTempChatResourceType,
  mergeTempChatHistoryEntry,
  normalizeTempChatAuthorName,
  pruneExpiredTempChatHistory,
  TEMP_CHAT_HISTORY_STORAGE_KEY,
  TEMP_CHAT_MAX_ATTACHMENTS,
  TEMP_CHAT_MAX_MESSAGE_LENGTH,
  type TempChatMessageAttachment,
} from '@/utils/temp-chat';
import {
  AlertDialog,
  Dropdown,
  Form,
  Input,
  Label,
  Modal,
  Spinner,
  TextArea,
  TextField,
  Typography,
} from '@heroui/react';
import {
  Check,
  Download,
  Ellipsis,
  FileText,
  Link2,
  MessagesSquare,
  Paperclip,
  Send,
  Share2,
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

type ChatAttachment = {
  provider: 'cloudinary' | 'r2';
  path: string;
  url?: string;
  previewUrl?: string;
  downloadUrl?: string;
  name: string;
  size: number;
  type?: string;
  isImage: boolean;
};

type ChatMessage = {
  id: string;
  memberId: string;
  authorName: string;
  content?: string;
  createdAt: string;
  editedAt?: string;
  attachments: ChatAttachment[];
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

function isChatMessage(value: unknown): value is ChatMessage {
  return (
    isJsonObject(value) &&
    typeof value.id === 'string' &&
    typeof value.memberId === 'string' &&
    typeof value.authorName === 'string' &&
    typeof value.createdAt === 'string' &&
    Array.isArray(value.attachments)
  );
}

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

type ChatMessageRowProps = {
  message: ChatMessage;
  isOwn: boolean;
  localeTag: string;
  labels: {
    you: string;
    edited: string;
    copyText: string;
    editMessage: string;
    deleteMessage: string;
    messageActions: string;
    cancel: string;
    save: string;
    download: string;
  };
  isEditing: boolean;
  editContent: string;
  onEditContent: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onCopyText: (content: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onDownload: (attachment: ChatAttachment) => void;
  onOpenImage: (attachment: ChatAttachment) => void;
};

function ChatMessageRow({
  message,
  isOwn,
  localeTag,
  labels,
  isEditing,
  editContent,
  onEditContent,
  onSaveEdit,
  onCancelEdit,
  onCopyText,
  onEdit,
  onDelete,
  onDownload,
  onOpenImage,
}: ChatMessageRowProps) {
  const tone = getTempChatMemberTone(message.memberId);
  const timeLabel = new Date(message.createdAt).toLocaleTimeString(localeTag, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <li className="group flex items-start gap-2.5">
      <span
        aria-hidden="true"
        className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold ${tone.avatar} ${tone.name}`}
      >
        {getTempChatInitials(message.authorName)}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs font-semibold ${tone.name}`}>
            {isOwn ? 'Вы' : message.authorName}
            <span className="font-normal text-muted">
              {' · '}
              {timeLabel}
              {message.editedAt ? ` · ${labels.edited}` : ''}
            </span>
          </span>

          <Dropdown>
            <Dropdown.Trigger
              aria-label={labels.messageActions}
              className="button button--icon-only button--sm button--tertiary flex opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            >
              <Ellipsis className="size-4" />
            </Dropdown.Trigger>
            <Dropdown.Popover placement="bottom end">
              <Dropdown.Menu
                onAction={(key) => {
                  if (key === 'copy' && message.content) {
                    onCopyText(message.content);
                  } else if (key === 'edit') {
                    onEdit();
                  } else if (key === 'delete') {
                    onDelete();
                  }
                }}
              >
                {message.content ? (
                  <Dropdown.Item id="copy" textValue={labels.copyText}>
                    <Label>{labels.copyText}</Label>
                  </Dropdown.Item>
                ) : null}
                {isOwn && message.attachments.length === 0 ? (
                  <Dropdown.Item id="edit" textValue={labels.editMessage}>
                    <Label>{labels.editMessage}</Label>
                  </Dropdown.Item>
                ) : null}
                {isOwn ? (
                  <Dropdown.Item
                    id="delete"
                    textValue={labels.deleteMessage}
                    variant="danger"
                  >
                    <Label>{labels.deleteMessage}</Label>
                  </Dropdown.Item>
                ) : null}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>

        {isEditing ? (
          <div className="flex flex-col gap-2 rounded-2xl bg-surface-tertiary px-3.5 py-2.5">
            <TextArea
              rows={3}
              variant="secondary"
              value={editContent}
              maxLength={TEMP_CHAT_MAX_MESSAGE_LENGTH}
              onChange={(event) => onEditContent(event.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" onPress={onSaveEdit}>
                {labels.save}
              </Button>
              <Button size="sm" variant="tertiary" onPress={onCancelEdit}>
                {labels.cancel}
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={`flex max-w-[85%] flex-col gap-2 rounded-2xl rounded-tl-sm px-3.5 py-2.5 ${tone.bubble}`}
          >
            {message.content ? (
              <Typography.Paragraph
                size="sm"
                className="whitespace-pre-wrap wrap-break-word"
              >
                {message.content}
              </Typography.Paragraph>
            ) : null}

            {message.attachments.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {message.attachments.map((attachment, attachmentIndex) =>
                  attachment.isImage ? (
                    <button
                      key={`${attachment.path}-${attachmentIndex}`}
                      type="button"
                      className="overflow-hidden rounded-xl border-0 p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      onClick={() => onOpenImage(attachment)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- the preview comes straight from the CDN url. */}
                      <img
                        src={attachment.previewUrl ?? attachment.url}
                        alt={attachment.name}
                        className="size-28 object-cover"
                        loading="lazy"
                      />
                    </button>
                  ) : (
                    <Button
                      key={`${attachment.path}-${attachmentIndex}`}
                      type="button"
                      size="sm"
                      variant="tertiary"
                      onPress={() => onDownload(attachment)}
                    >
                      <Download className="size-4" />
                      {attachment.name} (
                      {formatTempChatFileSize(attachment.size, localeTag)})
                    </Button>
                  ),
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </li>
  );
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
  const [files, setFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    done: number;
    total: number;
  }>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: string; content: string }>();
  const [viewer, setViewer] = useState<{
    urls: string[];
    names: string[];
    index: number;
  }>();
  const linkCopied = useTransientValue<string>();
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastCreatedAtRef = useRef<string | undefined>(undefined);

  const getStoredToken = useCallback(() => {
    const stored = readStoredMember(code);
    return stored?.token;
  }, [code]);

  const recordVisit = useCallback(
    (chatMeta: ChatMeta) => {
      try {
        const raw = window.localStorage.getItem(TEMP_CHAT_HISTORY_STORAGE_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : [];

        if (!Array.isArray(parsed)) {
          return;
        }

        const merged = pruneExpiredTempChatHistory(
          mergeTempChatHistoryEntry(parsed.filter(isTempChatHistoryEntry), {
            code,
            title: chatMeta.title,
            expiresAt: chatMeta.expiresAt,
            isOwner: chatMeta.isOwner,
            joinedAt: new Date().toISOString(),
          }),
        );

        window.localStorage.setItem(
          TEMP_CHAT_HISTORY_STORAGE_KEY,
          JSON.stringify(merged),
        );
      } catch {
        // History is a convenience feature; failures are safe to ignore.
      }
    },
    [code],
  );

  const linkCopiedShow = linkCopied.show;

  const applyMessages = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) {
      return;
    }

    setMessages((current) => {
      const seen = new Set(current.map((message) => message.id));
      const merged = [
        ...current,
        ...incoming.filter((message) => !seen.has(message.id)),
      ]
        .map(
          (message) =>
            incoming.find((item) => item.id === message.id) ?? message,
        )
        .sort((first, second) =>
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

        const chatMeta: ChatMeta = {
          title: metaBody.title,
          expiresAt: metaBody.expiresAt,
          requiresPassword: Boolean(metaBody.requiresPassword),
          isOwner: Boolean(metaBody.isOwner),
        };

        setMeta(chatMeta);
        recordVisit(chatMeta);

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
  }, [code, loadMessages, recordVisit, strings.loadFailed]);

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
  }, [messages.length, uploadProgress]);

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
      if (meta) {
        recordVisit(meta);
      }
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

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    setFiles(
      Array.from(event.currentTarget.files ?? []).slice(
        0,
        TEMP_CHAT_MAX_ATTACHMENTS,
      ),
    );

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function removeFile(index: number) {
    setFiles((current) =>
      current.filter((_, fileIndex) => fileIndex !== index),
    );
  }

  async function uploadAttachment(
    token: string,
    file: File,
  ): Promise<TempChatMessageAttachment> {
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
      typeof authorizeBody.fileName !== 'string' ||
      (authorizeBody.provider !== 'cloudinary' &&
        authorizeBody.provider !== 'r2')
    ) {
      throw new Error(getJsonError(authorizeBody) ?? strings.uploadFailed);
    }

    if (authorizeBody.provider === 'cloudinary') {
      if (
        typeof authorizeBody.publicId !== 'string' ||
        typeof authorizeBody.apiKey !== 'string' ||
        typeof authorizeBody.signature !== 'string' ||
        typeof authorizeBody.timestamp !== 'number'
      ) {
        throw new Error(strings.uploadFailed);
      }

      const uploadBody = new FormData();

      uploadBody.set('api_key', authorizeBody.apiKey);
      uploadBody.set('file', file);
      uploadBody.set('public_id', authorizeBody.publicId);
      uploadBody.set('signature', authorizeBody.signature);
      uploadBody.set('timestamp', String(authorizeBody.timestamp));

      const uploadResponse = await fetch(authorizeBody.uploadUrl, {
        method: 'POST',
        body: uploadBody,
      });
      const uploadResult = await readJsonResponse(uploadResponse);
      const uploadedUrl =
        isJsonObject(uploadResult) &&
        typeof uploadResult.secure_url === 'string'
          ? uploadResult.secure_url
          : undefined;

      if (
        !uploadResponse.ok ||
        !uploadedUrl ||
        !isJsonObject(uploadResult) ||
        uploadResult.public_id !== authorizeBody.publicId
      ) {
        throw new Error(strings.uploadFailed);
      }

      const uploadedResourceType =
        typeof uploadResult.resource_type === 'string' &&
        isTempChatResourceType(uploadResult.resource_type)
          ? uploadResult.resource_type
          : 'raw';

      return {
        provider: 'cloudinary',
        path: authorizeBody.publicId,
        url: uploadedUrl,
        resourceType: uploadedResourceType,
        name: authorizeBody.fileName,
        type: file.type || 'application/octet-stream',
        size: file.size,
      };
    }

    if (
      typeof authorizeBody.key !== 'string' ||
      typeof authorizeBody.contentDisposition !== 'string'
    ) {
      throw new Error(strings.uploadFailed);
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

    return {
      provider: 'r2',
      path: authorizeBody.key,
      url: null,
      resourceType: null,
      name: authorizeBody.fileName,
      type: file.type || 'application/octet-stream',
      size: file.size,
    };
  }

  async function send() {
    const token = getStoredToken();

    if (!token) {
      setState('gate');
      return;
    }

    const hasContent = content.trim().length > 0;

    if (!hasContent && files.length === 0) {
      return;
    }

    if (content.length > TEMP_CHAT_MAX_MESSAGE_LENGTH) {
      setError(strings.messageTooLong);
      return;
    }

    setIsSending(true);
    setError(undefined);

    try {
      let attachments: TempChatMessageAttachment[] | undefined;

      if (files.length > 0) {
        const uploaded: TempChatMessageAttachment[] = [];

        for (const [index, file] of files.entries()) {
          setUploadProgress({ done: index, total: files.length });

          try {
            uploaded.push(await uploadAttachment(token, file));
          } catch (uploadError) {
            // Already uploaded files are cleaned up by the daily cron
            // because they never become a message.
            setUploadProgress(undefined);
            throw uploadError;
          }
        }

        setUploadProgress({ done: files.length, total: files.length });
        attachments = uploaded;
      }

      const messageResponse = await fetch(`/api/temp-chats/${code}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: hasContent ? content : undefined,
          attachments,
        }),
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
      setFiles([]);
      setUploadProgress(undefined);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : strings.sendFailed,
      );
      setUploadProgress(undefined);
    } finally {
      setIsSending(false);
    }
  }

  async function saveEdit() {
    if (!editing) {
      return;
    }

    const token = getStoredToken();

    if (!token) {
      setState('gate');
      return;
    }

    if (!editing.content.trim()) {
      return;
    }

    try {
      const response = await fetch(
        `/api/temp-chats/${code}/messages/${editing.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: editing.content }),
        },
      );
      const body = await readJsonResponse(response);
      const message = isJsonObject(body) ? body.message : undefined;

      if (!response.ok || !isChatMessage(message)) {
        throw new Error(getJsonError(body) ?? strings.sendFailed);
      }

      setMessages((current) =>
        current.map((item) => (item.id === message.id ? message : item)),
      );
      setEditing(undefined);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : strings.sendFailed,
      );
    }
  }

  async function deleteMessage(messageId: string) {
    const token = getStoredToken();

    if (!token) {
      return;
    }

    try {
      const response = await fetch(
        `/api/temp-chats/${code}/messages/${messageId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) {
        const body = await readJsonResponse(response);

        throw new Error(getJsonError(body) ?? strings.deleteFailed);
      }

      setMessages((current) =>
        current.filter((message) => message.id !== messageId),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : strings.deleteFailed,
      );
    }
  }

  async function downloadAttachment(
    messageId: string,
    attachment: ChatAttachment,
  ) {
    const source = attachment.downloadUrl ?? attachment.url;

    if (!source) {
      setError(strings.linkFailed);
      return;
    }

    try {
      const response = await fetch(source);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');

      anchor.href = objectUrl;
      anchor.download = attachment.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : strings.linkFailed,
      );
    }
  }

  async function copyChatLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      linkCopiedShow(strings.copied);
    } catch {
      linkCopiedShow(strings.shareFailed);
    }
  }

  function shareChat() {
    const shareData = {
      title: meta?.title ?? strings.gateTitle,
      url: window.location.href,
    };

    if (typeof navigator.share === 'function') {
      void navigator.share(shareData).catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        void copyChatLink();
      });

      return;
    }

    void copyChatLink();
  }

  function copyMessageText(content: string) {
    void navigator.clipboard.writeText(content).catch(() => {
      setError(strings.copyText);
    });
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
  const chatImages = messages.flatMap((message) =>
    message.attachments
      .filter((attachment) => attachment.isImage)
      .map((attachment) => ({
        url:
          attachment.url ??
          attachment.previewUrl ??
          attachment.downloadUrl ??
          '',
        name: attachment.name,
      })),
  );

  function openImageViewer(attachment: ChatAttachment) {
    const clickedUrl =
      attachment.url ?? attachment.previewUrl ?? attachment.downloadUrl ?? '';
    const index = Math.max(
      0,
      chatImages.findIndex((image) => image.url === clickedUrl),
    );

    setViewer({
      urls: chatImages.map((image) => image.url),
      names: chatImages.map((image) => image.name),
      index,
    });
  }

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

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onPress={() => void copyChatLink()}
            >
              {linkCopied.value ? (
                <Check className="size-4" />
              ) : (
                <Link2 className="size-4" />
              )}
              {linkCopied.value ? strings.copied : strings.copyLink}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="tertiary"
              onPress={shareChat}
            >
              <Share2 className="size-4" />
              {strings.share}
            </Button>
          </div>

          <div
            ref={listRef}
            className="flex h-96 flex-col gap-4 overflow-y-auto rounded-2xl border bg-surface-secondary/45 p-4"
          >
            {messages.length === 0 ? (
              <Typography.Paragraph className="text-sm text-muted">
                {strings.empty}
              </Typography.Paragraph>
            ) : (
              <ul className="flex flex-col gap-4">
                {messages.map((message) => {
                  const isOwn = message.memberId === memberId;
                  const rowLabels = {
                    you: strings.you,
                    edited: strings.edited,
                    copyText: strings.copyText,
                    editMessage: strings.editMessage,
                    deleteMessage: strings.deleteMessage,
                    messageActions: strings.messageActions,
                    cancel: strings.cancel,
                    save: strings.save,
                    download: strings.download,
                  };

                  return (
                    <ChatMessageRow
                      key={message.id}
                      message={message}
                      isOwn={isOwn}
                      localeTag={localeTag}
                      labels={rowLabels}
                      isEditing={editing?.id === message.id}
                      editContent={
                        editing?.id === message.id ? editing.content : ''
                      }
                      onEditContent={(value) =>
                        setEditing((current) =>
                          current?.id === message.id
                            ? { id: current.id, content: value }
                            : current,
                        )
                      }
                      onSaveEdit={() => void saveEdit()}
                      onCancelEdit={() => setEditing(undefined)}
                      onCopyText={copyMessageText}
                      onEdit={() =>
                        setEditing({
                          id: message.id,
                          content: message.content ?? '',
                        })
                      }
                      onDelete={() => void deleteMessage(message.id)}
                      onDownload={(attachment) =>
                        void downloadAttachment(message.id, attachment)
                      }
                      onOpenImage={openImageViewer}
                    />
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
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            {files.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {files.map((file, fileIndex) => (
                  <li
                    key={`${file.name}-${fileIndex}`}
                    className="flex items-center justify-between gap-2 rounded-xl border bg-surface-secondary px-3 py-2 text-sm"
                  >
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
                      onPress={() => removeFile(fileIndex)}
                    >
                      <X className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
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
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    (event.ctrlKey || event.metaKey)
                  ) {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
            </TextField>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="sr-only"
                onChange={selectFiles}
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
              <span className="ml-auto hidden text-xs text-muted pointer-fine:inline">
                {strings.sendHint}
              </span>
              <span className="text-xs text-muted">
                {content.length.toLocaleString(localeTag)} /{' '}
                {TEMP_CHAT_MAX_MESSAGE_LENGTH.toLocaleString(localeTag)}
              </span>
            </div>

            {uploadProgress ? (
              <Typography.Paragraph size="sm" className="text-muted">
                {strings.uploadingFiles
                  .replace('{done}', String(uploadProgress.done))
                  .replace('{total}', String(uploadProgress.total))}
              </Typography.Paragraph>
            ) : null}
          </Form>
        </div>
      ) : null}

      <Modal>
        <Modal.Backdrop
          isOpen={viewer !== undefined}
          onOpenChange={(open) => {
            if (!open) {
              setViewer(undefined);
            }
          }}
        >
          <Modal.Container size="full">
            <Modal.Dialog className="h-full">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{strings.mediaTitle}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="h-[calc(100dvh-9rem)]">
                {viewer ? (
                  <MediaGallery
                    urls={viewer.urls}
                    initialIndex={viewer.index}
                    getAlt={(index) => viewer.names[index] ?? ''}
                  />
                ) : null}
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

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

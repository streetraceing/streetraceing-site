'use client';

import {
  Alert,
  Button,
  Card,
  Chip,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  Pagination,
  ProgressBar,
  Spinner,
  TextArea,
  TextField,
  Typography,
} from '@heroui/react';
import { Eye, EyeOff, LockKeyhole, LogOut, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import {
  Fragment,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  DEV_UPDATES_PAGE_SIZE,
  developmentDirections,
  devUpdateTopics,
  getDevUpdateTopicLabel,
  type DevUpdateTopic,
} from '@/utils/stats';

type DevUpdate = {
  id: string;
  title: string | null;
  content: string;
  topic: DevUpdateTopic;
  createdAt: string;
};

type FeedResponse = {
  updates: DevUpdate[];
  pagination: {
    page: number;
    total: number;
    totalPages: number;
  };
};

type SessionResponse = {
  authenticated: boolean;
  configured: boolean;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

function getVisiblePages(currentPage: number, totalPages: number) {
  return [
    ...new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages]),
  ]
    .filter((page) => page > 0 && page <= totalPages)
    .sort((firstPage, secondPage) => firstPage - secondPage);
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <Typography.Prose className="max-w-none break-words text-sm leading-6 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-l-2 [&_blockquote]:border-accent/60 [&_blockquote]:pl-3 [&_blockquote]:text-muted [&_code:not(.hljs)]:rounded-md [&_code:not(.hljs)]:bg-default-soft [&_code:not(.hljs)]:px-1.5 [&_code:not(.hljs)]:py-0.5 [&_code:not(.hljs)]:text-[0.8125rem] [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:my-3 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre_code]:min-w-max [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown
        rehypePlugins={[[rehypeHighlight, { detect: true }]]}
        components={{
          a: ({ href, children }) => {
            const isExternal =
              href?.startsWith('https://') || href?.startsWith('http://');

            return (
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noreferrer' : undefined}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </Typography.Prose>
  );
}

type AuthorControlsProps = {
  session: SessionResponse;
  onAuthenticated: () => void;
  onLogout: () => void;
  onCreated: (update: DevUpdate) => void;
};

function AuthorControls({
  session,
  onAuthenticated,
  onLogout,
  onCreated,
}: AuthorControlsProps) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string>();
  const [isLoginPending, setIsLoginPending] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState<DevUpdateTopic>('projects');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [publishError, setPublishError] = useState<string>();
  const [isPublishing, setIsPublishing] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoginPending(true);
    setLoginError(undefined);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? 'Не удалось войти.');
      }

      setPassword('');
      setIsLoginOpen(false);
      onAuthenticated();
    } catch (caughtError) {
      setLoginError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Не удалось войти.',
      );
    } finally {
      setIsLoginPending(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    onLogout();
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPublishing(true);
    setPublishError(undefined);

    try {
      const response = await fetch('/api/dev-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, topic }),
      });
      const body = (await response.json()) as {
        error?: string;
        update?: DevUpdate;
      };

      if (!response.ok) {
        throw new Error(body.error ?? 'Не удалось опубликовать заметку.');
      }

      if (!body.update) {
        throw new Error('Сервер не вернул опубликованную заметку.');
      }

      setTitle('');
      setContent('');
      setIsPreviewOpen(false);
      onCreated(body.update);
    } catch (caughtError) {
      setPublishError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Не удалось опубликовать заметку.',
      );
    } finally {
      setIsPublishing(false);
    }
  }

  if (!session.configured) {
    return (
      <Alert status="warning">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Авторский режим пока не настроен</Alert.Title>
        </Alert.Content>
      </Alert>
    );
  }

  if (!session.authenticated) {
    return (
      <div className="flex flex-col gap-3">
        <Button
          className="self-start"
          variant="tertiary"
          onPress={() => setIsLoginOpen((value) => !value)}
        >
          <LockKeyhole />
          Войти как автор
        </Button>

        {isLoginOpen && (
          <Card variant="secondary">
            <Card.Content>
              <Form className="flex flex-col gap-3" onSubmit={login}>
                <TextField
                  isRequired
                  fullWidth
                  name="password"
                  value={password}
                  onChange={setPassword}
                  validate={(value) => (value ? null : 'Введи пароль.')}
                >
                  <Label>Пароль автора</Label>
                  <Input type="password" autoComplete="current-password" />
                  <FieldError />
                </TextField>
                <Button
                  className="self-start"
                  type="submit"
                  isPending={isLoginPending}
                >
                  <LockKeyhole />
                  Войти
                </Button>
              </Form>
            </Card.Content>
          </Card>
        )}

        {loginError && (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Вход не выполнен</Alert.Title>
              <Alert.Description>{loginError}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <Card variant="secondary">
      <Card.Header className="flex-row items-start justify-between gap-3">
        <div>
          <Card.Title>Новая заметка</Card.Title>
          <Card.Description>
            Эта форма видна только в авторской сессии.
          </Card.Description>
        </div>
        <Button
          isIconOnly
          aria-label="Выйти из авторского режима"
          size="sm"
          variant="tertiary"
          onPress={() => void logout()}
        >
          <LogOut />
        </Button>
      </Card.Header>
      <Card.Content>
        <Form className="flex flex-col gap-4" onSubmit={publish}>
          <TextField fullWidth name="title" value={title} onChange={setTitle}>
            <Label>Заголовок (необязательно)</Label>
            <Input maxLength={160} placeholder="Например, новый этап проекта" />
            <Description>{title.length} / 160</Description>
          </TextField>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Тема</p>
            <div className="flex flex-wrap gap-2" aria-label="Тема заметки">
              {devUpdateTopics.map((item) => (
                <Button
                  key={item.value}
                  type="button"
                  size="sm"
                  variant={topic === item.value ? 'primary' : 'secondary'}
                  onPress={() => setTopic(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <TextField
            isRequired
            fullWidth
            name="content"
            value={content}
            onChange={setContent}
            validate={(value) =>
              value.trim() ? null : 'Напишите хотя бы одну строчку.'
            }
          >
            <Label>Заметка</Label>
            <TextArea
              variant="primary"
              rows={6}
              maxLength={8_000}
              placeholder="Что нового в разработке?"
            />
            <Description>
              Markdown поддерживается: **жирный**, _курсив_, списки и ссылки.
              Блок кода: ```ts … ```. {content.length.toLocaleString('ru-RU')} /
              8 000
            </Description>
            <FieldError />
          </TextField>

          <div className="flex flex-col items-start gap-3">
            <Button
              type="button"
              size="sm"
              variant="tertiary"
              onPress={() => setIsPreviewOpen((value) => !value)}
            >
              {isPreviewOpen ? <EyeOff /> : <Eye />}
              {isPreviewOpen ? 'Скрыть предпросмотр' : 'Предпросмотр Markdown'}
            </Button>

            {isPreviewOpen && (
              <Card className="w-full" variant="transparent">
                <Card.Header>
                  <Card.Title>Предпросмотр</Card.Title>
                </Card.Header>
                <Card.Content>
                  {content.trim() ? (
                    <MarkdownContent content={content} />
                  ) : (
                    <Typography.Paragraph className="text-muted" size="sm">
                      Напиши заметку, чтобы увидеть результат.
                    </Typography.Paragraph>
                  )}
                </Card.Content>
              </Card>
            )}
          </div>

          <Button className="self-start" type="submit" isPending={isPublishing}>
            <Send />
            Опубликовать
          </Button>
        </Form>

        {publishError && (
          <Alert className="mt-4" status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Заметка не опубликована</Alert.Title>
              <Alert.Description>{publishError}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}
      </Card.Content>
    </Card>
  );
}

export function StatsSection() {
  const [session, setSession] = useState<SessionResponse>();
  const [updates, setUpdates] = useState<DevUpdate[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<DevUpdateTopic>();
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<FeedResponse['pagination']>();
  const [feedError, setFeedError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const feedRequestId = useRef(0);

  useEffect(() => {
    let isCancelled = false;

    fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Не удалось проверить авторскую сессию.');
        }

        return (await response.json()) as SessionResponse;
      })
      .then((nextSession) => {
        if (!isCancelled) {
          setSession(nextSession);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setSession({ authenticated: false, configured: false });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = feedRequestId.current + 1;
    const searchParams = new URLSearchParams({ page: String(page) });

    feedRequestId.current = requestId;

    if (selectedTopic) {
      searchParams.set('topic', selectedTopic);
    }

    fetch(`/api/dev-updates?${searchParams}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Не удалось загрузить новости.');
        }

        return (await response.json()) as FeedResponse;
      })
      .then((body) => {
        if (requestId === feedRequestId.current) {
          setUpdates(body.updates);
          setPagination(body.pagination);
          setFeedError(undefined);
        }
      })
      .catch((caughtError: unknown) => {
        if (
          caughtError instanceof DOMException &&
          caughtError.name === 'AbortError'
        ) {
          return;
        }

        if (requestId === feedRequestId.current) {
          setFeedError(
            caughtError instanceof Error
              ? caughtError.message
              : 'Не удалось загрузить новости.',
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted && requestId === feedRequestId.current) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [page, selectedTopic]);

  const visiblePages = useMemo(
    () =>
      pagination ? getVisiblePages(pagination.page, pagination.totalPages) : [],
    [pagination],
  );

  function selectTopic(topic: DevUpdateTopic | undefined) {
    setIsLoading(true);
    setFeedError(undefined);
    setSelectedTopic(topic);
    setPage(1);
  }

  function selectPage(nextPage: number) {
    setIsLoading(true);
    setFeedError(undefined);
    setPage(nextPage);
  }

  function refreshSession() {
    void fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Не удалось проверить авторскую сессию.');
        }

        return (await response.json()) as SessionResponse;
      })
      .then(setSession)
      .catch(() => setSession({ authenticated: false, configured: false }));
  }

  return (
    <section
      id="stats"
      className="scroll-mt-16 flex flex-col gap-4 border-t pt-4"
    >
      <div className="flex flex-col gap-1">
        <Typography.Heading level={3}>Статистика и новости</Typography.Heading>
        <Typography.Paragraph className="text-muted">
          Направления, в которых сейчас больше всего практики, и заметки о
          разработке.
        </Typography.Paragraph>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {developmentDirections.map((direction) => (
          <Card key={direction.label} variant="secondary">
            <Card.Header className="flex-row items-center justify-between gap-3">
              <Card.Title className="text-lg font-semibold">
                {direction.label}
              </Card.Title>
              <Chip color={direction.color} size="sm" variant="soft">
                {direction.value}%
              </Chip>
            </Card.Header>
            <Card.Content>
              <ProgressBar
                value={direction.value}
                color={direction.color}
                size="sm"
                valueLabel={`${direction.value}%`}
                aria-label={`${direction.label}: ${direction.value}%`}
              >
                <ProgressBar.Track>
                  <ProgressBar.Fill />
                </ProgressBar.Track>
              </ProgressBar>
            </Card.Content>
          </Card>
        ))}
      </div>

      {session ? (
        <AuthorControls
          session={session}
          onAuthenticated={refreshSession}
          onLogout={() =>
            setSession((current) => ({
              authenticated: false,
              configured: current?.configured ?? false,
            }))
          }
          onCreated={(update) => {
            const belongsToCurrentFilter =
              !selectedTopic || selectedTopic === update.topic;

            if (!belongsToCurrentFilter) {
              return;
            }

            feedRequestId.current += 1;
            setIsLoading(false);

            if (page === 1) {
              setUpdates((currentUpdates) =>
                [
                  update,
                  ...currentUpdates.filter(
                    (currentUpdate) => currentUpdate.id !== update.id,
                  ),
                ].slice(0, DEV_UPDATES_PAGE_SIZE),
              );
            }

            setPagination((currentPagination) =>
              currentPagination
                ? {
                    ...currentPagination,
                    total: currentPagination.total + 1,
                    totalPages: Math.max(
                      1,
                      Math.ceil(
                        (currentPagination.total + 1) / DEV_UPDATES_PAGE_SIZE,
                      ),
                    ),
                  }
                : currentPagination,
            );
          }}
        />
      ) : (
        <div className="flex justify-center py-2">
          <Spinner size="sm" />
        </div>
      )}

      <section
        className="flex flex-col gap-3"
        aria-labelledby="updates-heading"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Typography.Heading id="updates-heading" level={4}>
              Наработки и новости
            </Typography.Heading>
            <Typography.Paragraph className="text-muted">
              Короткие заметки по проектам, AI, обучению и сайту.
            </Typography.Paragraph>
          </div>
          {pagination && (
            <Chip size="sm" variant="secondary" className="py-11">
              Всего: {pagination.total}
            </Chip>
          )}
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Фильтр новостей">
          <Button
            size="sm"
            variant={selectedTopic ? 'secondary' : 'primary'}
            onPress={() => selectTopic(undefined)}
          >
            Все
          </Button>
          {devUpdateTopics.map((topic) => (
            <Button
              key={topic.value}
              size="sm"
              variant={selectedTopic === topic.value ? 'primary' : 'secondary'}
              onPress={() => selectTopic(topic.value)}
            >
              {topic.label}
            </Button>
          ))}
        </div>

        {feedError && (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Новости не загрузились</Alert.Title>
              <Alert.Description>{feedError}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        {isLoading && updates.length === 0 && (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        )}

        {!isLoading && !feedError && updates.length === 0 && (
          <Card variant="transparent">
            <Card.Content className="text-sm text-muted">
              Здесь появятся первые заметки после публикации в авторском режиме.
            </Card.Content>
          </Card>
        )}

        {updates.length > 0 && (
          <div className="flex flex-col gap-3">
            {updates.map((update) => (
              <Card key={update.id} variant="secondary">
                <Card.Header className="gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip color="accent" size="sm" variant="soft">
                      {getDevUpdateTopicLabel(update.topic)}
                    </Chip>
                    <span className="text-xs text-muted">
                      {formatDate(update.createdAt)}
                    </span>
                  </div>
                  {update.title && <Card.Title>{update.title}</Card.Title>}
                </Card.Header>
                <Card.Content>
                  <MarkdownContent content={update.content} />
                </Card.Content>
              </Card>
            ))}
          </div>
        )}

        {isLoading && updates.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Spinner size="sm" />
            Обновляю ленту…
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <Pagination size="sm">
            <Pagination.Summary>
              Страница {pagination.page} из {pagination.totalPages}
            </Pagination.Summary>
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous
                  isDisabled={pagination.page === 1}
                  onPress={() => selectPage(pagination.page - 1)}
                >
                  <Pagination.PreviousIcon />
                  <span>Назад</span>
                </Pagination.Previous>
              </Pagination.Item>
              {visiblePages.map((visiblePage, index) => (
                <Fragment key={visiblePage}>
                  {index > 0 && visiblePage - visiblePages[index - 1] > 1 && (
                    <Pagination.Item>
                      <Pagination.Ellipsis />
                    </Pagination.Item>
                  )}
                  <Pagination.Item>
                    <Pagination.Link
                      isActive={pagination.page === visiblePage}
                      onPress={() => selectPage(visiblePage)}
                    >
                      {visiblePage}
                    </Pagination.Link>
                  </Pagination.Item>
                </Fragment>
              ))}
              <Pagination.Item>
                <Pagination.Next
                  isDisabled={pagination.page === pagination.totalPages}
                  onPress={() => selectPage(pagination.page + 1)}
                >
                  <span>Далее</span>
                  <Pagination.NextIcon />
                </Pagination.Next>
              </Pagination.Item>
            </Pagination.Content>
          </Pagination>
        )}
      </section>
    </section>
  );
}

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
import { LockKeyhole, LogOut, Send } from 'lucide-react';
import { Fragment, type FormEvent, useEffect, useMemo, useState } from 'react';

import {
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

type AuthorControlsProps = {
  session: SessionResponse;
  onAuthenticated: () => void;
  onLogout: () => void;
  onCreated: (topic: DevUpdateTopic) => void;
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
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? 'Не удалось опубликовать заметку.');
      }

      setTitle('');
      setContent('');
      onCreated(topic);
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
              {content.length.toLocaleString('ru-RU')} / 8 000
            </Description>
            <FieldError />
          </TextField>

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
  const [reloadKey, setReloadKey] = useState(0);

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
    let isCancelled = false;
    const searchParams = new URLSearchParams({ page: String(page) });

    if (selectedTopic) {
      searchParams.set('topic', selectedTopic);
    }

    fetch(`/api/dev-updates?${searchParams}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Не удалось загрузить новости.');
        }

        return (await response.json()) as FeedResponse;
      })
      .then((body) => {
        if (!isCancelled) {
          setUpdates(body.updates);
          setPagination(body.pagination);
          setFeedError(undefined);
        }
      })
      .catch((caughtError: unknown) => {
        if (!isCancelled) {
          setFeedError(
            caughtError instanceof Error
              ? caughtError.message
              : 'Не удалось загрузить новости.',
          );
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [page, reloadKey, selectedTopic]);

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
          onCreated={(topic) => {
            setIsLoading(true);
            setFeedError(undefined);
            setSelectedTopic(topic);
            setPage(1);
            setReloadKey((currentKey) => currentKey + 1);
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
            <Chip size="sm" variant="secondary" className="px-2">
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

        {isLoading && (
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

        {!isLoading && updates.length > 0 && (
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
                  <p className="whitespace-pre-wrap text-sm leading-6">
                    {update.content}
                  </p>
                </Card.Content>
              </Card>
            ))}
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

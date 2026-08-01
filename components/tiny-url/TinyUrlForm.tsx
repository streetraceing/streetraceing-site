'use client';

import { Button } from '@/components/ui/Button';
import { useLocale } from '@/app/providers';
import { getLocaleTag } from '@/utils/i18n';
import {
  Alert,
  AlertDialog,
  Card,
  Description,
  FieldError,
  Form,
  Label,
  Link,
  Spinner,
  TextArea,
  TextField,
  Typography,
} from '@heroui/react';
import { Check, Copy, Link as LinkIcon, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';

import { ToolOutput } from '@/components/tools/ToolOutput';
import {
  toolAlertClassName,
  toolFieldClassName,
  toolPanelClassName,
} from '@/components/tools/toolStyles';

type TinyUrlItem = {
  code: string;
  preview: string;
  contentLength: number;
  createdAt: string;
  expiresAt: string;
  visitCount: number;
  shortUrl: string;
};

type ApiErrorResponse = {
  error?: string;
};

const MAX_CONTENT_LENGTH = 20_000;

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function TinyUrlForm() {
  const { copy, locale } = useLocale();
  const strings = copy.tinyUrl;
  const localeTag = getLocaleTag(locale);
  const [content, setContent] = useState('');
  const [items, setItems] = useState<TinyUrlItem[]>([]);
  const [createdItem, setCreatedItem] = useState<TinyUrlItem>();
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string>();
  const [deletingCode, setDeletingCode] = useState<string>();
  const [deleteDialogCode, setDeleteDialogCode] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();

    async function loadItems() {
      try {
        const response = await fetch('/api/short-urls', {
          cache: 'no-store',
          signal: controller.signal,
        });
        const body = (await response.json()) as
          { items: TinyUrlItem[] } | ApiErrorResponse;

        if (!response.ok || !('items' in body)) {
          throw new Error(
            'error' in body && typeof body.error === 'string'
              ? body.error
              : strings.loadFailed,
          );
        }

        setItems(body.items);
        setError(undefined);
      } catch (caughtError) {
        if (
          caughtError instanceof DOMException &&
          caughtError.name === 'AbortError'
        ) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : strings.loadFailed,
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingItems(false);
        }
      }
    }

    void loadItems();

    return () => controller.abort();
  }, [strings.loadFailed]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setCreatedItem(undefined);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/short-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const body = (await response.json()) as
        { item: TinyUrlItem } | ApiErrorResponse;

      if (!response.ok) {
        throw new Error(
          'error' in body && typeof body.error === 'string'
            ? body.error
            : strings.saveFailed,
        );
      }

      if (!('item' in body)) {
        throw new Error(strings.invalidServerResponse);
      }

      setCreatedItem(body.item);
      setItems((currentItems) => [
        body.item,
        ...currentItems.filter((item) => item.code !== body.item.code),
      ]);
      setContent('');
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : strings.saveFailed,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyShortUrl(item: TinyUrlItem) {
    try {
      await navigator.clipboard.writeText(item.shortUrl);
      setCopiedCode(item.code);
      window.setTimeout(() => setCopiedCode(undefined), 2_000);
    } catch {
      setError(strings.copyFailed);
    }
  }

  async function deleteItem(item: TinyUrlItem, close: () => void) {
    setDeletingCode(item.code);
    setError(undefined);

    try {
      const response = await fetch(
        `/api/short-urls?code=${encodeURIComponent(item.code)}`,
        { method: 'DELETE' },
      );
      const body = (await response.json()) as ApiErrorResponse;

      if (!response.ok) {
        throw new Error(body.error ?? strings.deleteFailed);
      }

      setItems((currentItems) =>
        currentItems.filter((currentItem) => currentItem.code !== item.code),
      );
      setCreatedItem((currentItem) =>
        currentItem?.code === item.code ? undefined : currentItem,
      );
      close();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : strings.deleteFailed,
      );
    } finally {
      setDeletingCode(undefined);
    }
  }

  return (
    <div className="space-y-4">
      <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TextField
          isRequired
          fullWidth
          name="content"
          value={content}
          onChange={setContent}
          validate={(value) => {
            if (value.trim().length === 0) {
              return strings.required;
            }

            if (value.length > MAX_CONTENT_LENGTH) {
              return strings.maxLength.replace(
                '{count}',
                MAX_CONTENT_LENGTH.toLocaleString(localeTag),
              );
            }

            return null;
          }}
        >
          <Label>{strings.fieldLabel}</Label>
          <TextArea
            variant="secondary"
            className={toolFieldClassName}
            placeholder={strings.fieldPlaceholder}
            rows={7}
            maxLength={MAX_CONTENT_LENGTH}
          />
          <Description>
            {content.length.toLocaleString(localeTag)} /{' '}
            {MAX_CONTENT_LENGTH.toLocaleString(localeTag)} {strings.characters}
          </Description>
          <FieldError />
        </TextField>

        <Button className="self-start" type="submit" isPending={isSubmitting}>
          {({ isPending }) => (
            <>
              {isPending ? <Spinner color="current" size="sm" /> : <LinkIcon />}
              {isPending ? strings.saving : strings.create}
            </>
          )}
        </Button>
      </Form>

      {error ? (
        <Alert status="danger" className={toolAlertClassName}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{strings.errorTitle}</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {createdItem ? (
        <ToolOutput
          content={createdItem.shortUrl}
          label={strings.saved}
          format="url"
          tone="success"
        />
      ) : null}

      <section className="space-y-3" aria-labelledby="your-data-heading">
        <div>
          <h2 id="your-data-heading" className="text-lg font-semibold">
            {strings.yourData}
          </h2>
          <p className="text-sm text-muted">{strings.ownerDescription}</p>
        </div>

        {isLoadingItems ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : null}

        {!isLoadingItems && !error && items.length === 0 ? (
          <Card variant="transparent" className={toolPanelClassName}>
            <Card.Content className="text-sm text-muted">
              {strings.emptyList}
            </Card.Content>
          </Card>
        ) : null}

        {!isLoadingItems && items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => (
              <Card
                key={item.code}
                variant="secondary"
                className={toolPanelClassName}
              >
                <Card.Header>
                  <Card.Title className="truncate">
                    {item.preview || strings.emptyData}
                  </Card.Title>
                  <Card.Description>
                    {formatDate(item.createdAt, localeTag)} ·{' '}
                    {item.contentLength.toLocaleString(localeTag)}{' '}
                    {strings.characters} ·{' '}
                    {strings.visits.replace('{count}', String(item.visitCount))}
                    {' · '}
                    {strings.expires.replace(
                      '{date}',
                      formatDate(item.expiresAt, localeTag),
                    )}
                  </Card.Description>
                </Card.Header>
                <Card.Footer className="justify-between gap-3">
                  <Link
                    className="min-w-0 truncate"
                    href={item.shortUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {item.shortUrl}
                  </Link>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      isIconOnly
                      aria-label={strings.copyShortUrl}
                      size="sm"
                      variant="tertiary"
                      onPress={() => void copyShortUrl(item)}
                    >
                      {copiedCode === item.code ? <Check /> : <Copy />}
                    </Button>
                    <Button
                      isIconOnly
                      aria-label={strings.delete}
                      size="sm"
                      variant="danger"
                      onPress={() => setDeleteDialogCode(item.code)}
                    >
                      <Trash2 />
                    </Button>
                    <AlertDialog>
                      <AlertDialog.Backdrop
                        isOpen={deleteDialogCode === item.code}
                        variant="blur"
                        onOpenChange={(isOpen) => {
                          if (!isOpen) {
                            setDeleteDialogCode(undefined);
                          }
                        }}
                      >
                        <AlertDialog.Container size="sm">
                          <AlertDialog.Dialog>
                            {({ close }) => (
                              <>
                                <AlertDialog.Header>
                                  <AlertDialog.Icon status="danger">
                                    <Trash2 />
                                  </AlertDialog.Icon>
                                  <AlertDialog.Heading>
                                    {strings.deleteTitle}
                                  </AlertDialog.Heading>
                                </AlertDialog.Header>
                                <AlertDialog.Body>
                                  <Typography.Paragraph className="text-muted">
                                    {strings.deleteDescription}
                                  </Typography.Paragraph>
                                </AlertDialog.Body>
                                <AlertDialog.Footer>
                                  <Button slot="close" variant="tertiary">
                                    {strings.cancel}
                                  </Button>
                                  <Button
                                    isPending={deletingCode === item.code}
                                    variant="danger"
                                    onPress={() => void deleteItem(item, close)}
                                  >
                                    <Trash2 />
                                    {strings.delete}
                                  </Button>
                                </AlertDialog.Footer>
                              </>
                            )}
                          </AlertDialog.Dialog>
                        </AlertDialog.Container>
                      </AlertDialog.Backdrop>
                    </AlertDialog>
                  </div>
                </Card.Footer>
              </Card>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

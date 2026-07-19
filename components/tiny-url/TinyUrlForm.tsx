'use client';

import { useLocale } from '@/app/providers';
import { getLocaleTag } from '@/utils/i18n';
import {
  Alert,
  Button,
  Card,
  Description,
  FieldError,
  Form,
  Label,
  Link,
  Spinner,
  TextArea,
  TextField,
} from '@heroui/react';
import { Check, Copy, Link as LinkIcon } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

type TinyUrlItem = {
  code: string;
  content: string;
  createdAt: string;
  visitCount: number;
  shortUrl: string;
};

type ApiErrorResponse = {
  error?: string;
};

const MAX_CONTENT_LENGTH = 100_000;

function getPreview(content: string, emptyData: string) {
  const normalizedContent = content.replace(/\s+/g, ' ').trim();
  return normalizedContent.length > 120
    ? `${normalizedContent.slice(0, 120)}…`
    : normalizedContent || emptyData;
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function TinyUrlForm() {
  const { copy, locale } = useLocale();
  const strings = copy.tinyUrl;
  const [content, setContent] = useState('');
  const [items, setItems] = useState<TinyUrlItem[]>([]);
  const [createdItem, setCreatedItem] = useState<TinyUrlItem>();
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();

    async function loadItems() {
      try {
        const response = await fetch('/api/short-urls', {
          signal: controller.signal,
        });
        const body = (await response.json()) as
          | { items: TinyUrlItem[] }
          | ApiErrorResponse;

        if (!response.ok || !('items' in body)) {
          return;
        }

        setItems(body.items);
      } catch (caughtError) {
        if (
          !(
            caughtError instanceof DOMException &&
            caughtError.name === 'AbortError'
          )
        ) {
          setError(strings.loadFailed);
        }
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
        | { item: TinyUrlItem }
        | ApiErrorResponse;

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
      setItems((currentItems) => [body.item, ...currentItems]);
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
                MAX_CONTENT_LENGTH.toLocaleString(getLocaleTag(locale)),
              );
            }

            return null;
          }}
        >
          <Label>{strings.fieldLabel}</Label>
          <TextArea
            variant="secondary"
            placeholder={strings.fieldPlaceholder}
            rows={7}
            maxLength={MAX_CONTENT_LENGTH}
          />
          <Description>
            {content.length.toLocaleString(getLocaleTag(locale))} /{' '}
            {MAX_CONTENT_LENGTH.toLocaleString(getLocaleTag(locale))}{' '}
            {strings.characters}
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
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{strings.errorTitle}</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {createdItem ? (
        <Alert status="success" className="bg-surface-secondary">
          <Alert.Indicator />
          <Alert.Content className="min-w-0">
            <Alert.Title>{strings.saved}</Alert.Title>
            <Alert.Description>
              <Link href={createdItem.shortUrl} target="_blank">
                {createdItem.shortUrl}
              </Link>
            </Alert.Description>
            <Button
              className="mt-3 self-start"
              size="sm"
              variant="secondary"
              onPress={() => void copyShortUrl(createdItem)}
            >
              {copiedCode === createdItem.code ? <Check /> : <Copy />}
              {copiedCode === createdItem.code ? strings.copied : strings.copy}
            </Button>
          </Alert.Content>
        </Alert>
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

        {!isLoadingItems && items.length === 0 ? (
          <Card variant="transparent">
            <Card.Content className="text-sm text-muted">
              {strings.emptyList}
            </Card.Content>
          </Card>
        ) : null}

        {!isLoadingItems && items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.code} variant="secondary">
                <Card.Header>
                  <Card.Title className="truncate">
                    {getPreview(item.content, strings.emptyData)}
                  </Card.Title>
                  <Card.Description>
                    {formatDate(item.createdAt, getLocaleTag(locale))} ·{' '}
                    {strings.visits.replace('{count}', String(item.visitCount))}
                  </Card.Description>
                </Card.Header>
                <Card.Footer className="justify-between gap-3">
                  <Link
                    className="min-w-0 truncate"
                    href={item.shortUrl}
                    target="_blank"
                  >
                    {item.shortUrl}
                  </Link>
                  <Button
                    isIconOnly
                    aria-label={strings.copyShortUrl}
                    size="sm"
                    variant="tertiary"
                    onPress={() => void copyShortUrl(item)}
                  >
                    {copiedCode === item.code ? <Check /> : <Copy />}
                  </Button>
                </Card.Footer>
              </Card>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

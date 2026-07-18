'use client';

import { Check, Copy, LoaderCircle } from 'lucide-react';
import { FormEvent, useState } from 'react';

type CreateShortUrlResponse = {
  shortUrl: string;
};

type ApiErrorResponse = {
  error?: string;
};

export function TinyUrlForm() {
  const [url, setUrl] = useState('');
  const [shortUrl, setShortUrl] = useState<string>();
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setShortUrl(undefined);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/short-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const body = (await response.json()) as
        | CreateShortUrlResponse
        | ApiErrorResponse;

      if (!response.ok) {
        throw new Error(
          'error' in body && typeof body.error === 'string'
            ? body.error
            : 'Не удалось создать короткую ссылку.',
        );
      }

      if (!('shortUrl' in body)) {
        throw new Error('Сервер вернул некорректный ответ.');
      }

      setShortUrl(body.shortUrl);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Не удалось создать короткую ссылку.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyShortUrl() {
    if (!shortUrl) return;

    await navigator.clipboard.writeText(shortUrl);
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 2_000);
  }

  return (
    <div className="space-y-5">
      <form className="space-y-3" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="destination-url">
          Длинная ссылка
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="destination-url"
            className="input input--primary input--full-width min-w-0"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://example.com/очень-длинная-ссылка"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            required
            maxLength={2_048}
          />
          <button
            className="button button--primary shrink-0"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : null}
            Сократить
          </button>
        </div>
      </form>

      {error ? (
        <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground">
          {error}
        </p>
      ) : null}

      {shortUrl ? (
        <div className="rounded-2xl border border-accent/20 bg-accent-soft p-4">
          <p className="mb-2 text-sm text-muted">Готово — твоя ссылка:</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              className="min-w-0 flex-1 truncate font-medium text-accent underline underline-offset-4"
              href={shortUrl}
              target="_blank"
              rel="noreferrer"
            >
              {shortUrl}
            </a>
            <button
              className="button button--secondary button--sm shrink-0"
              type="button"
              onClick={copyShortUrl}
            >
              {isCopied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              {isCopied ? 'Скопировано' : 'Копировать'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

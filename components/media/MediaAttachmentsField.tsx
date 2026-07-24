/* eslint-disable @next/next/no-img-element -- Remote media images are already compressed and served directly without invoking Vercel Image Optimization. */
'use client';

import { Alert, Button, Typography } from '@heroui/react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { isAllowedMediaType, MAX_MEDIA_SOURCE_BYTES } from '@/utils/media';

function PendingImagePreview({ file }: { file: File }) {
  const [previewUrl, setPreviewUrl] = useState<string>();

  useEffect(() => {
    const nextPreviewUrl = URL.createObjectURL(file);
    const frame = window.requestAnimationFrame(() => {
      setPreviewUrl(nextPreviewUrl);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [file]);

  return previewUrl ? (
    <img
      src={previewUrl}
      alt=""
      className="size-full object-cover"
      decoding="async"
    />
  ) : (
    <div aria-hidden="true" className="size-full bg-default-soft" />
  );
}

type MediaAttachmentsFieldProps = {
  existingUrls: string[];
  pendingFiles: File[];
  maximum: number;
  label: string;
  description: string;
  addLabel: string;
  removeLabel: string;
  invalidTypeMessage: string;
  tooLargeMessage: string;
  limitMessage: string;
  onExistingUrlsChange: (urls: string[]) => void;
  onPendingFilesChange: (files: File[]) => void;
};

export function MediaAttachmentsField({
  existingUrls,
  pendingFiles,
  maximum,
  label,
  description,
  addLabel,
  removeLabel,
  invalidTypeMessage,
  tooLargeMessage,
  limitMessage,
  onExistingUrlsChange,
  onPendingFilesChange,
}: MediaAttachmentsFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const total = existingUrls.length + pendingFiles.length;

  function addFiles(files: FileList | null) {
    if (!files) {
      return;
    }

    const nextFiles = Array.from(files);

    if (inputRef.current) {
      inputRef.current.value = '';
    }

    if (nextFiles.some((file) => !isAllowedMediaType(file.type))) {
      setError(invalidTypeMessage);
      return;
    }

    if (nextFiles.some((file) => file.size > MAX_MEDIA_SOURCE_BYTES)) {
      setError(tooLargeMessage);
      return;
    }

    const availableSlots = maximum - total;

    if (nextFiles.length > availableSlots) {
      setError(limitMessage);
      return;
    }

    setError(undefined);
    onPendingFilesChange([...pendingFiles, ...nextFiles]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Typography.Heading level={4}>{label}</Typography.Heading>
        <Typography.Paragraph className="text-sm text-muted">
          {description}
        </Typography.Paragraph>
      </div>

      {total > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {existingUrls.map((url) => (
            <div
              key={url}
              className="group relative aspect-video overflow-hidden rounded-lg border bg-default-soft"
            >
              <img
                src={url}
                alt=""
                className="size-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <Button
                type="button"
                aria-label={removeLabel}
                isIconOnly
                size="sm"
                variant="danger"
                className="absolute right-2 top-2"
                onPress={() =>
                  onExistingUrlsChange(
                    existingUrls.filter((currentUrl) => currentUrl !== url),
                  )
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}

          {pendingFiles.map((file, index) => (
            <div
              key={`${file.name}-${file.lastModified}-${index}`}
              className="group relative aspect-video overflow-hidden rounded-lg border bg-default-soft"
            >
              <PendingImagePreview file={file} />
              <Button
                type="button"
                aria-label={removeLabel}
                isIconOnly
                size="sm"
                variant="danger"
                className="absolute right-2 top-2"
                onPress={() =>
                  onPendingFilesChange(
                    pendingFiles.filter(
                      (_currentFile, currentIndex) => currentIndex !== index,
                    ),
                  )
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        className="sr-only"
        onChange={(event) => addFiles(event.currentTarget.files)}
      />

      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="self-start"
        isDisabled={total >= maximum}
        onPress={() => inputRef.current?.click()}
      >
        <ImagePlus />
        {addLabel} ({total}/{maximum})
      </Button>

      {error ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
    </div>
  );
}

/* eslint-disable @next/next/no-img-element -- Cloudinary provides the optimized square previews while the modal intentionally displays the original asset. */
'use client';

import { Button, Modal, Typography } from '@heroui/react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Expand,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useRef,
  useState,
} from 'react';
import Tilt from 'react-parallax-tilt';

import { useLocale } from '@/app/providers';
import {
  getCloudinaryDownloadUrl,
  getCloudinaryImageInfoUrl,
  getCloudinarySquareImageUrl,
} from '@/utils/media';

type MediaGalleryProps = {
  urls: string[];
  getAlt: (index: number) => string;
};

type ImageMetadata = {
  status: 'loading' | 'ready' | 'error';
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
};

type CloudinaryImageInfo = {
  input?: {
    width?: number;
    height?: number;
    bytes?: number;
    format?: string;
  };
};

type PanPosition = {
  x: number;
  y: number;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function normalizeIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

function getFormatFromUrl(url: string) {
  try {
    const extension = new URL(url).pathname.match(/\.([a-z0-9]+)$/i)?.[1];

    return extension?.toUpperCase();
  } catch {
    return undefined;
  }
}

function formatBytes(bytes: number, locale: string) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return undefined;
  }

  const units = locale.startsWith('ru')
    ? ['Б', 'КБ', 'МБ', 'ГБ']
    : ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: unitIndex === 0 ? 0 : 2,
  }).format(value)} ${units[unitIndex]}`;
}

export function MediaGallery({ urls, getAlt }: MediaGalleryProps) {
  const { copy, locale } = useLocale();
  const strings = copy.mediaGallery;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState<PanPosition>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [metadataByUrl, setMetadataByUrl] = useState<
    Record<string, ImageMetadata | undefined>
  >({});
  const pendingMetadata = useRef(new Set<string>());
  const dragState = useRef<DragState | undefined>(undefined);

  if (urls.length === 0) {
    return null;
  }

  const currentIndex = Math.min(activeIndex, urls.length - 1);
  const currentUrl = urls[currentIndex]!;
  const currentMetadata = metadataByUrl[currentUrl];
  const canNavigate = urls.length > 1;

  function resetView() {
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
    dragState.current = undefined;
    setIsDragging(false);
  }

  async function loadMetadata(url: string) {
    if (metadataByUrl[url] || pendingMetadata.current.has(url)) {
      return;
    }

    pendingMetadata.current.add(url);
    setMetadataByUrl((current) => ({
      ...current,
      [url]: { status: 'loading' },
    }));

    try {
      const response = await fetch(getCloudinaryImageInfoUrl(url), {
        cache: 'force-cache',
      });

      if (!response.ok) {
        throw new Error('metadata-request-failed');
      }

      const body = (await response.json()) as CloudinaryImageInfo;
      const input = body.input;

      if (!input?.width || !input.height) {
        throw new Error('metadata-response-invalid');
      }

      setMetadataByUrl((current) => ({
        ...current,
        [url]: {
          status: 'ready',
          width: input.width,
          height: input.height,
          bytes: input.bytes,
          format: input.format?.toUpperCase() ?? getFormatFromUrl(url),
        },
      }));
    } catch {
      setMetadataByUrl((current) => ({
        ...current,
        [url]: {
          ...current[url],
          status: 'error',
          format: current[url]?.format ?? getFormatFromUrl(url),
        },
      }));
    } finally {
      pendingMetadata.current.delete(url);
    }
  }

  function rememberNaturalSize(url: string, image: HTMLImageElement) {
    if (!image.naturalWidth || !image.naturalHeight) {
      return;
    }

    setMetadataByUrl((current) => {
      const previous = current[url];

      if (
        previous?.width === image.naturalWidth &&
        previous.height === image.naturalHeight
      ) {
        return current;
      }

      return {
        ...current,
        [url]: {
          ...previous,
          status: previous?.status === 'loading' ? 'loading' : 'ready',
          width: image.naturalWidth,
          height: image.naturalHeight,
          format: previous?.format ?? getFormatFromUrl(url),
        },
      };
    });
  }

  function selectImage(index: number) {
    const nextIndex = normalizeIndex(index, urls.length);

    setActiveIndex(nextIndex);
    resetView();

    if (isViewerOpen) {
      void loadMetadata(urls[nextIndex]!);
    }
  }

  function openViewer(index: number) {
    const nextIndex = normalizeIndex(index, urls.length);

    setActiveIndex(nextIndex);
    resetView();
    setIsViewerOpen(true);
    void loadMetadata(urls[nextIndex]!);
  }

  function handleViewerOpenChange(isOpen: boolean) {
    setIsViewerOpen(isOpen);

    if (!isOpen) {
      resetView();
    }
  }

  function changeZoom(nextZoom: number) {
    const normalizedZoom = clampZoom(nextZoom);

    setZoom(normalizedZoom);

    if (normalizedZoom === MIN_ZOOM) {
      setPan({ x: 0, y: 0 });
    }
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    changeZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  }

  function handleViewerKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const target = event.target;

    if (target instanceof Element && target.closest('button, a, input')) {
      return;
    }

    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      changeZoom(zoom + ZOOM_STEP);
      return;
    }

    if (event.key === '-') {
      event.preventDefault();
      changeZoom(zoom - ZOOM_STEP);
      return;
    }

    if (event.key === '0') {
      event.preventDefault();
      resetView();
      return;
    }

    if (!canNavigate) {
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      selectImage(currentIndex - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      selectImage(currentIndex + 1);
    }
  }

  function startDragging(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target;

    if (
      zoom <= MIN_ZOOM ||
      (target instanceof Element && target.closest('button, a, input'))
    ) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    };
  }

  function dragImage(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragState.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    setPan({
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY,
    });
  }

  function stopDragging(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragState.current?.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragState.current = undefined;
    setIsDragging(false);
  }

  const qualityParts: string[] = [];

  if (currentMetadata?.width && currentMetadata.height) {
    qualityParts.push(
      `${currentMetadata.width.toLocaleString(locale)} × ${currentMetadata.height.toLocaleString(locale)} px`,
    );
  }

  if (currentMetadata?.format) {
    qualityParts.push(currentMetadata.format);
  }

  const formattedBytes = currentMetadata?.bytes
    ? formatBytes(currentMetadata.bytes, locale)
    : undefined;

  if (formattedBytes) {
    qualityParts.push(formattedBytes);
  }

  const qualityText =
    currentMetadata?.status === 'loading'
      ? strings.loadingMetadata
      : qualityParts.length > 0
        ? qualityParts.join(' • ')
        : strings.metadataUnavailable;

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="relative mx-auto w-full max-w-3xl">
        <Tilt
          className="w-full"
          tiltMaxAngleX={7}
          tiltMaxAngleY={7}
          scale={1.01}
          perspective={1_200}
          transitionSpeed={450}
        >
          <button
            type="button"
            className="group relative block aspect-square w-full overflow-hidden rounded-2xl border bg-default-soft text-left"
            aria-label={strings.openImage.replace(
              '{index}',
              String(currentIndex + 1),
            )}
            onClick={() => openViewer(currentIndex)}
          >
            <img
              src={getCloudinarySquareImageUrl(currentUrl, 1_080)}
              alt={getAlt(currentIndex)}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              loading="lazy"
              decoding="async"
            />
            <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/15" />
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-black/65 px-3 py-2 text-sm text-white backdrop-blur-sm">
              <Expand className="size-4" />
              {strings.openFullscreen}
            </span>
          </button>
        </Tilt>

        {canNavigate ? (
          <>
            <Button
              type="button"
              isIconOnly
              variant="secondary"
              className="absolute left-3 top-1/2 -translate-y-1/2 shadow-lg"
              aria-label={strings.previousImage}
              onPress={() => selectImage(currentIndex - 1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              type="button"
              isIconOnly
              variant="secondary"
              className="absolute right-3 top-1/2 -translate-y-1/2 shadow-lg"
              aria-label={strings.nextImage}
              onPress={() => selectImage(currentIndex + 1)}
            >
              <ChevronRight />
            </Button>
          </>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Typography.Paragraph className="text-sm text-muted">
          {strings.counter
            .replace('{current}', String(currentIndex + 1))
            .replace('{total}', String(urls.length))}
        </Typography.Paragraph>

        {canNavigate ? (
          <div
            className="flex max-w-full gap-2 overflow-x-auto pb-1"
            role="group"
            aria-label={strings.thumbnails}
          >
            {urls.map((url, index) => (
              <button
                key={url}
                type="button"
                aria-label={strings.selectImage.replace(
                  '{index}',
                  String(index + 1),
                )}
                aria-current={index === currentIndex ? 'true' : undefined}
                className="size-14 shrink-0 overflow-hidden rounded-lg border-2 bg-default-soft transition-opacity hover:opacity-90 aria-current:border-accent"
                onClick={() => selectImage(index)}
              >
                <img
                  src={getCloudinarySquareImageUrl(url, 160)}
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Modal>
        <Modal.Backdrop
          isOpen={isViewerOpen}
          variant="blur"
          onOpenChange={handleViewerOpenChange}
        >
          <Modal.Container size="full">
            <Modal.Dialog className="h-dvh max-h-dvh w-dvw max-w-none rounded-none">
              <Modal.CloseTrigger />
              <Modal.Header className="border-b">
                <div className="flex min-w-0 flex-col">
                  <Modal.Heading>{strings.viewerTitle}</Modal.Heading>
                  <span className="text-sm text-muted">
                    {strings.counter
                      .replace('{current}', String(currentIndex + 1))
                      .replace('{total}', String(urls.length))}
                  </span>
                </div>
              </Modal.Header>

              <Modal.Body className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
                <div
                  className={`relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black/95 ${
                    zoom > MIN_ZOOM
                      ? 'cursor-grab touch-none active:cursor-grabbing'
                      : 'cursor-zoom-in'
                  }`}
                  role="group"
                  tabIndex={0}
                  aria-label={strings.zoomArea}
                  onKeyDown={handleViewerKeyDown}
                  onDoubleClick={() =>
                    changeZoom(zoom === MIN_ZOOM ? 2 : MIN_ZOOM)
                  }
                  onWheel={handleWheel}
                  onPointerDown={startDragging}
                  onPointerMove={dragImage}
                  onPointerUp={stopDragging}
                  onPointerCancel={stopDragging}
                >
                  <img
                    src={currentUrl}
                    alt={getAlt(currentIndex)}
                    className="max-h-full max-w-full select-none object-contain will-change-transform"
                    draggable={false}
                    decoding="async"
                    style={{
                      transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                      transition: isDragging
                        ? 'none'
                        : 'transform 160ms ease-out',
                    }}
                    onLoad={(event) =>
                      rememberNaturalSize(currentUrl, event.currentTarget)
                    }
                  />

                  {canNavigate ? (
                    <>
                      <Button
                        type="button"
                        isIconOnly
                        variant="secondary"
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                        aria-label={strings.previousImage}
                        onPress={() => selectImage(currentIndex - 1)}
                      >
                        <ChevronLeft />
                      </Button>
                      <Button
                        type="button"
                        isIconOnly
                        variant="secondary"
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        aria-label={strings.nextImage}
                        onPress={() => selectImage(currentIndex + 1)}
                      >
                        <ChevronRight />
                      </Button>
                    </>
                  ) : null}
                </div>
              </Modal.Body>

              <Modal.Footer className="flex-col items-stretch gap-3 border-t sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-1" aria-live="polite">
                  <span className="text-sm font-medium">
                    {strings.originalQuality}
                  </span>
                  <span className="truncate text-sm text-muted">
                    {qualityText}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    isIconOnly
                    size="sm"
                    variant="tertiary"
                    aria-label={strings.zoomOut}
                    isDisabled={zoom <= MIN_ZOOM}
                    onPress={() => changeZoom(zoom - ZOOM_STEP)}
                  >
                    <ZoomOut />
                  </Button>

                  <label className="flex min-w-36 items-center gap-2 text-sm">
                    <span className="sr-only">{strings.zoom}</span>
                    <input
                      type="range"
                      min={MIN_ZOOM}
                      max={MAX_ZOOM}
                      step={ZOOM_STEP}
                      value={zoom}
                      className="w-full accent-current"
                      aria-label={strings.zoom}
                      onChange={(event) =>
                        changeZoom(Number(event.currentTarget.value))
                      }
                    />
                    <span className="w-12 text-right tabular-nums">
                      {Math.round(zoom * 100)}%
                    </span>
                  </label>

                  <Button
                    type="button"
                    isIconOnly
                    size="sm"
                    variant="tertiary"
                    aria-label={strings.zoomIn}
                    isDisabled={zoom >= MAX_ZOOM}
                    onPress={() => changeZoom(zoom + ZOOM_STEP)}
                  >
                    <ZoomIn />
                  </Button>

                  <Button
                    type="button"
                    isIconOnly
                    size="sm"
                    variant="tertiary"
                    aria-label={strings.resetZoom}
                    isDisabled={zoom === MIN_ZOOM && pan.x === 0 && pan.y === 0}
                    onPress={resetView}
                  >
                    <RotateCcw />
                  </Button>

                  <a
                    href={getCloudinaryDownloadUrl(currentUrl)}
                    download
                    className="button button--primary button--sm"
                  >
                    <Download className="size-4" />
                    {strings.download}
                  </a>
                </div>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

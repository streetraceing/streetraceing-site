/* eslint-disable @next/next/no-img-element -- Cloudinary provides the optimized square previews while the modal intentionally displays the original asset. */
'use client';

import { Button, ButtonRipple } from '@/components/ui/Button';
import { Modal } from '@heroui/react';
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

type SwipeState = {
  pointerId: number;
  startX: number;
  startY: number;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;
const SWIPE_DISTANCE = 52;
const SWIPE_AXIS_RATIO = 1.2;

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
  const carouselRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<DragState | undefined>(undefined);
  const swipeState = useRef<SwipeState | undefined>(undefined);

  if (urls.length === 0) {
    return null;
  }

  const currentIndex = Math.min(activeIndex, urls.length - 1);
  const currentUrl = urls[currentIndex];
  const currentMetadata = metadataByUrl[currentUrl];
  const canNavigate = urls.length > 1;

  function resetView() {
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
    dragState.current = undefined;
    swipeState.current = undefined;
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
      void loadMetadata(urls[nextIndex]);
    }
  }

  function openViewer(index: number) {
    const nextIndex = normalizeIndex(index, urls.length);

    setActiveIndex(nextIndex);
    resetView();
    setIsViewerOpen(true);
    void loadMetadata(urls[nextIndex]);
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

    if (target instanceof Element && target.closest('button, a, input')) {
      return;
    }

    if (zoom <= MIN_ZOOM) {
      if (canNavigate && event.pointerType === 'touch') {
        event.currentTarget.setPointerCapture(event.pointerId);
        swipeState.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
        };
      }

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

  function releasePointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function stopDragging(event: ReactPointerEvent<HTMLDivElement>) {
    const swipe = swipeState.current;

    if (swipe?.pointerId === event.pointerId) {
      releasePointer(event);
      swipeState.current = undefined;

      const deltaX = event.clientX - swipe.startX;
      const deltaY = event.clientY - swipe.startY;

      if (
        Math.abs(deltaX) >= SWIPE_DISTANCE &&
        Math.abs(deltaX) >= Math.abs(deltaY) * SWIPE_AXIS_RATIO
      ) {
        selectImage(currentIndex + (deltaX < 0 ? 1 : -1));
      }

      return;
    }

    if (dragState.current?.pointerId !== event.pointerId) {
      return;
    }

    releasePointer(event);
    dragState.current = undefined;
    setIsDragging(false);
  }

  function cancelPointerInteraction(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      dragState.current?.pointerId !== event.pointerId &&
      swipeState.current?.pointerId !== event.pointerId
    ) {
      return;
    }

    releasePointer(event);
    dragState.current = undefined;
    swipeState.current = undefined;
    setIsDragging(false);
  }

  function scrollCarousel(direction: -1 | 1) {
    const carousel = carouselRef.current;

    if (!carousel) {
      return;
    }

    carousel.scrollBy({
      left: direction * Math.max(carousel.clientWidth * 0.75, 160),
      behavior: 'smooth',
    });
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
      <div className="relative w-full">
        {canNavigate ? (
          <Button
            type="button"
            isIconOnly
            size="sm"
            variant="secondary"
            className="absolute left-1 top-1/2 z-10 -translate-y-1/2 shadow-lg"
            aria-label={strings.previousImage}
            onPress={() => scrollCarousel(-1)}
          >
            <ChevronLeft />
          </Button>
        ) : null}

        <div
          ref={carouselRef}
          className={`flex snap-x snap-mandatory touch-pan-x gap-3 overflow-x-auto overscroll-x-contain py-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            canNavigate ? 'px-10' : 'px-1'
          }`}
          role="list"
          aria-label={strings.thumbnails}
        >
          {urls.map((url, index) => (
            <div
              key={url}
              className="w-28 shrink-0 snap-start sm:w-32 lg:w-36"
              role="listitem"
            >
              <Tilt
                className="w-full"
                tiltMaxAngleX={8}
                tiltMaxAngleY={8}
                scale={1.035}
                perspective={900}
                transitionSpeed={350}
              >
                <button
                  type="button"
                  className="group relative block aspect-square w-full overflow-hidden rounded-xl border bg-default-soft text-left shadow-sm"
                  aria-label={strings.openImage.replace(
                    '{index}',
                    String(index + 1),
                  )}
                  onClick={() => openViewer(index)}
                >
                  <ButtonRipple />
                  <img
                    src={getCloudinarySquareImageUrl(url, 640)}
                    srcSet={[
                      `${getCloudinarySquareImageUrl(url, 320)} 320w`,
                      `${getCloudinarySquareImageUrl(url, 640)} 640w`,
                      `${getCloudinarySquareImageUrl(url, 1_080)} 1080w`,
                    ].join(', ')}
                    sizes="(min-width: 1024px) 9rem, (min-width: 640px) 8rem, 7rem"
                    alt={getAlt(index)}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/15" />
                  <span className="absolute bottom-2 right-2 inline-flex size-8 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur-sm">
                    <Expand className="size-4" />
                    <span className="sr-only">{strings.openFullscreen}</span>
                  </span>
                  <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-1 text-xs text-white backdrop-blur-sm">
                    {index + 1}
                  </span>
                </button>
              </Tilt>
            </div>
          ))}
        </div>

        {canNavigate ? (
          <Button
            type="button"
            isIconOnly
            size="sm"
            variant="secondary"
            className="absolute right-1 top-1/2 z-10 -translate-y-1/2 shadow-lg"
            aria-label={strings.nextImage}
            onPress={() => scrollCarousel(1)}
          >
            <ChevronRight />
          </Button>
        ) : null}
      </div>

      <Modal>
        <Modal.Backdrop
          isOpen={isViewerOpen}
          variant="blur"
          onOpenChange={handleViewerOpenChange}
        >
          <Modal.Container size="cover">
            <Modal.Dialog className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden">
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
                  className={`relative flex min-h-80 flex-1 items-center justify-center overflow-hidden bg-surface-secondary ${
                    zoom > MIN_ZOOM
                      ? 'cursor-grab touch-none active:cursor-grabbing'
                      : 'cursor-zoom-in touch-pan-y'
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
                  onPointerCancel={cancelPointerInteraction}
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
                    <ButtonRipple />
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

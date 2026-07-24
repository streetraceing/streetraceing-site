'use client';

import { Button as HeroUIButton } from '@heroui/react';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  useEffect,
  useRef,
} from 'react';

type HeroButtonProps = ComponentPropsWithoutRef<typeof HeroUIButton>;
type HeroButtonRef = ComponentRef<typeof HeroUIButton>;

export function ButtonRipple({ disabled = false }: { disabled?: boolean }) {
  const layerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const host = layer?.parentElement;

    if (!layer || !host) {
      return;
    }

    function isHostDisabled() {
      return (
        disabled ||
        host.matches(':disabled, [aria-disabled="true"], [data-disabled]')
      );
    }

    function addWave(clientX?: number, clientY?: number) {
      if (isHostDisabled()) {
        return;
      }

      const bounds = host.getBoundingClientRect();
      const size = Math.hypot(bounds.width, bounds.height) * 2;
      const x = clientX ?? bounds.left + bounds.width / 2;
      const y = clientY ?? bounds.top + bounds.height / 2;
      const wave = document.createElement('span');

      wave.className = 'button-ripple-wave';
      wave.style.width = `${size}px`;
      wave.style.height = `${size}px`;
      wave.style.left = `${x - bounds.left - size / 2}px`;
      wave.style.top = `${y - bounds.top - size / 2}px`;
      layer.append(wave);
      wave.addEventListener('animationend', () => wave.remove(), {
        once: true,
      });
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }

      addWave(event.clientX, event.clientY);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) {
        return;
      }

      addWave();
    }

    host.addEventListener('pointerdown', handlePointerDown, { passive: true });
    host.addEventListener('keydown', handleKeyDown);

    return () => {
      host.removeEventListener('pointerdown', handlePointerDown);
      host.removeEventListener('keydown', handleKeyDown);
      layer.replaceChildren();
    };
  }, [disabled]);

  return (
    <span ref={layerRef} aria-hidden="true" className="button-ripple-layer" />
  );
}

export const Button = forwardRef<HeroButtonRef, HeroButtonProps>(
  function RippleButton(
    { children, isDisabled, isPending, ...props },
    forwardedRef,
  ) {
    const rippleDisabled = Boolean(isDisabled || isPending);
    const content =
      typeof children === 'function' ? (
        (values: Parameters<typeof children>[0]) => (
          <>
            <ButtonRipple
              disabled={rippleDisabled || Boolean(values.isDisabled)}
            />
            {children(values)}
          </>
        )
      ) : (
        <>
          <ButtonRipple disabled={rippleDisabled} />
          {children}
        </>
      );

    return (
      <HeroUIButton
        {...props}
        ref={forwardedRef}
        isDisabled={isDisabled}
        isPending={isPending}
      >
        {content}
      </HeroUIButton>
    );
  },
);

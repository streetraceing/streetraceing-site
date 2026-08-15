'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useTransientValue<T>() {
  const [value, setValue] = useState<T>();
  const timeoutRef = useRef<number | undefined>(undefined);

  const cancelTimeout = useCallback(() => {
    if (timeoutRef.current !== undefined) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  const clear = useCallback(() => {
    cancelTimeout();
    setValue(undefined);
  }, [cancelTimeout]);

  const show = useCallback((nextValue: T, durationMs = 2_000) => {
    if (timeoutRef.current !== undefined) {
      window.clearTimeout(timeoutRef.current);
    }

    setValue(nextValue);
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = undefined;
      setValue(undefined);
    }, durationMs);
  }, []);

  useEffect(() => cancelTimeout, [cancelTimeout]);

  return { value, show, clear } as const;
}

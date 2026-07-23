'use client';

import { HOME_LAYOUT_SETTLED_EVENT } from '@/utils/client-events';
import { useLayoutEffect } from 'react';

function scrollToHashTarget() {
  const hash = window.location.hash;

  if (!hash) {
    return;
  }

  const target = document.getElementById(decodeURIComponent(hash.slice(1)));
  target?.scrollIntoView({ block: 'start' });
}

export function HomeScrollManager() {
  useLayoutEffect(() => {
    let frame = 0;
    const navigation = performance.getEntriesByType('navigation')[0] as
      PerformanceNavigationTiming | undefined;

    const scheduleHashScroll = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(scrollToHashTarget);
    };

    if (window.location.hash) {
      scheduleHashScroll();
    } else if (navigation?.type !== 'back_forward') {
      // A fresh visit to the home route always starts at its beginning. Browser
      // back/forward navigation keeps the browser's native scroll restoration.
      frame = window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      });
    }

    window.addEventListener('hashchange', scheduleHashScroll);
    window.addEventListener(HOME_LAYOUT_SETTLED_EVENT, scheduleHashScroll);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', scheduleHashScroll);
      window.removeEventListener(HOME_LAYOUT_SETTLED_EVENT, scheduleHashScroll);
    };
  }, []);

  return null;
}

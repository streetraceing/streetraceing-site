'use client';

import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';

type PrivacyAnalyticsProps = {
  analyticsEnabled: boolean;
  speedInsightsSampleRate: number;
  publicPaths: string[];
};

export function PrivacyAnalytics({
  analyticsEnabled,
  speedInsightsSampleRate,
  publicPaths,
}: PrivacyAnalyticsProps) {
  const pathname = usePathname();
  const privacyLocked = useRef(false);
  const allowedPaths = useMemo(() => new Set(publicPaths), [publicPaths]);
  const isPublicPath = allowedPaths.has(pathname);

  useEffect(() => {
    // Do not resume telemetry in this document after a private SPA visit:
    // SDKs may retain navigation/referrer data after their components unmount.
    if (!isPublicPath) {
      privacyLocked.current = true;
    }
  }, [isPublicPath]);

  const beforeSend = useMemo(() => {
    function publicUrl(value: string) {
      const url = new URL(value, window.location.origin);
      if (
        url.origin !== window.location.origin ||
        !allowedPaths.has(url.pathname)
      ) {
        return null;
      }

      url.search = '';
      url.hash = '';
      return url;
    }

    return function filterEvent<T extends { url: string; route?: string }>(
      event: T,
    ): T | null {
      if (typeof window === 'undefined' || privacyLocked.current) {
        return null;
      }

      try {
        const url = publicUrl(event.url);
        const currentUrl = publicUrl(window.location.href);
        const referrer = document.referrer ? new URL(document.referrer) : null;
        const privateReferrer =
          referrer?.origin === window.location.origin &&
          !publicUrl(referrer.href);

        // Validate the event's own URL as well as the current location so a
        // delayed private event cannot escape after navigation to a public page.
        if (!url || !currentUrl || privateReferrer) {
          privacyLocked.current = true;
          return null;
        }

        return {
          ...event,
          url: url.toString(),
          ...('route' in event ? { route: url.pathname } : {}),
        };
      } catch {
        privacyLocked.current = true;
        return null;
      }
    };
  }, [allowedPaths]);

  // Avoid loading scripts on an initial private visit. The beforeSend guards
  // remain necessary because previously loaded scripts survive SPA unmounts.
  if (!isPublicPath) {
    return null;
  }

  return (
    <>
      {analyticsEnabled ? <Analytics beforeSend={beforeSend} /> : null}
      {speedInsightsSampleRate > 0 ? (
        <SpeedInsights
          sampleRate={speedInsightsSampleRate}
          beforeSend={beforeSend}
        />
      ) : null}
    </>
  );
}

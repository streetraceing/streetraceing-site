'use client';

import { getSeason, type Season } from '@/utils/seasonal';
import type { LucideIcon } from 'lucide-react';
import { Egg, Ghost, Snowflake } from 'lucide-react';
import { useSyncExternalStore } from 'react';

const subscribeToNothing = () => () => {};

type DecorationSpot = {
  left: string;
  top: string;
  size: string;
  duration: string;
  delay: string;
};

const decorationSpots: DecorationSpot[] = [
  { left: '5%', top: '16%', size: 'size-6', duration: '11s', delay: '0s' },
  { left: '14%', top: '64%', size: 'size-5', duration: '13s', delay: '-6s' },
  { left: '37%', top: '10%', size: 'size-5', duration: '10s', delay: '-3s' },
  { left: '57%', top: '74%', size: 'size-6', duration: '12s', delay: '-8s' },
  { left: '74%', top: '20%', size: 'size-5', duration: '14s', delay: '-4s' },
  { left: '91%', top: '58%', size: 'size-6', duration: '11s', delay: '-2s' },
];

const seasonIcons: Record<Exclude<Season, 'none'>, LucideIcon> = {
  halloween: Ghost,
  'new-year': Snowflake,
  easter: Egg,
};

const seasonTones: Record<Exclude<Season, 'none'>, string> = {
  halloween: 'text-warning',
  'new-year': 'text-accent',
  easter: 'text-success',
};

export function SeasonalDecorations() {
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  if (!mounted) {
    return null;
  }

  const season = getSeason(new Date());

  if (season === 'none') {
    return null;
  }

  const Icon = seasonIcons[season];

  return (
    <>
      {decorationSpots.map((spot) => (
        <span
          key={`${spot.left}-${spot.top}`}
          aria-hidden="true"
          className={`pointer-events-none absolute ${spot.size} ${seasonTones[season]} opacity-25 motion-reduce:hidden`}
          style={{
            left: spot.left,
            top: spot.top,
            animation: `seasonal-drift ${spot.duration} ease-in-out ${spot.delay} infinite`,
          }}
        >
          <Icon className="size-full" />
        </span>
      ))}
    </>
  );
}

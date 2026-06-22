import { Size } from '@/utils/site';
import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const projectSizeClasses: Record<Size, string> = {
  sm: 'md:col-span-1 md:row-span-1',
  md: 'md:col-span-2 md:row-span-1',
  lg: 'md:col-span-3 md:row-span-1',
} as const;

export function createBackgroundGradient(...colors: string[]) {
  const stops = colors.map((color, index) => {
    const percent = Math.round((index / (colors.length - 1)) * 100);

    return `${color} ${percent}%`;
  });

  return {
    background: `linear-gradient(135deg, ${stops.join(', ')})`,
  };
}

export function createBorderGradient(...colors: string[]) {
  const stops = colors.map((color, index) => {
    const percent = Math.round((index / (colors.length - 1)) * 100);

    return `${color} ${percent}%`;
  });

  return {
    borderImage: `linear-gradient(135deg, ${stops.join(', ')}) 1`,
  };
}

export function classMerge(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

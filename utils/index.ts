import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

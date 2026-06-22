import { classMerge } from '@/utils';

export function Container({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={classMerge(
        'mx-auto w-full max-w-360 px-4 sm:px-6 lg:px-8',
        className,
      )}
      {...props}
    />
  );
}

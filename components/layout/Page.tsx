import clsx from 'clsx';

export interface PageProps extends React.ComponentPropsWithoutRef<'main'> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export function Page({ className, header, footer, ...props }: PageProps) {
  return (
    <div id="app" className="relative isolate min-h-dvh">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background"
      >
        <div className="absolute inset-0 hidden dark:block">
          <div className="absolute inset-0 bg-[url('/images/space-stars.png')] bg-cover bg-center opacity-40 md:hidden" />
          <div className="absolute inset-0 hidden bg-[url('/images/space-stars.gif')] bg-repeat bg-size-[640px_360px] opacity-40 mix-blend-lighten motion-safe:md:block" />
          <div className="absolute inset-0 hidden bg-[url('/images/space-stars.png')] bg-cover bg-center opacity-40 motion-reduce:md:block" />
        </div>
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col">
        {header}

        <main className={clsx('flex flex-1', className)} {...props} />

        {footer}
      </div>
    </div>
  );
}

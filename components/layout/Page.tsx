import clsx from 'clsx';

export interface PageProps extends React.ComponentPropsWithoutRef<'main'> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export function Page({ className, header, footer, ...props }: PageProps) {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background"
        aria-hidden="true"
      >
        <div className="absolute inset-0 opacity-0 mix-blend-screen brightness-125 contrast-125 dark:opacity-80">
          <div className="absolute inset-0 bg-[url('/images/space-stars.gif')] bg-repeat bg-size-[640px_360px] motion-safe:animate-pulse motion-safe:animation-duration-[12s]" />
          <div className="absolute inset-0 -scale-x-100 bg-[url('/images/space-stars.gif')] bg-repeat bg-position-[320px_180px] bg-size-[960px_540px] opacity-45 motion-safe:animate-pulse motion-safe:[animation-delay:-7s] motion-safe:animation-duration-[17s]" />
        </div>
      </div>

      <div id="app" className="relative z-10 flex min-h-screen flex-col">
        {header}
        <main className={clsx('flex flex-1', className)} {...props} />
      </div>
      {footer ? <div className="relative z-10">{footer}</div> : null}
    </>
  );
}

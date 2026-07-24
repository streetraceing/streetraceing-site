import clsx from 'clsx';

export interface PageProps extends React.ComponentPropsWithoutRef<'main'> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export function Page({ className, header, footer, ...props }: PageProps) {
  return (
    <>
      <div className="cosmic-backdrop" aria-hidden="true" />
      <div id="app" className="relative z-10 flex min-h-screen flex-col">
        {header}
        <main className={clsx('flex flex-1', className)} {...props} />
      </div>
      {footer ? <div className="relative z-10">{footer}</div> : null}
    </>
  );
}

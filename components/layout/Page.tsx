import clsx from 'clsx';

export interface PageProps extends React.ComponentPropsWithoutRef<'main'> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export function Page({ className, header, footer, ...props }: PageProps) {
  return (
    <>
      <div id="app" className="flex flex-col min-h-screen">
        {header}
        <main className={clsx('flex flex-1', className)} {...props} />
      </div>
      {footer}
    </>
  );
}

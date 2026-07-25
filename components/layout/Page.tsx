import spaceStars from '@/public/images/space-stars.png';
import clsx from 'clsx';
import Image from 'next/image';

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
        <div className="absolute inset-0 bg-linear-to-b from-background via-background to-surface-secondary/15" />
        <Image
          src={spaceStars}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-[0.025] dark:opacity-[0.1]"
        />
        <div className="absolute -left-48 top-1/4 size-96 rounded-full bg-accent/[0.012] blur-3xl dark:bg-accent/[0.018]" />
        <div className="absolute -right-56 bottom-1/4 size-112 rounded-full bg-accent/1 blur-3xl dark:bg-accent/1.5" />
      </div>
      <div id="app" className="relative z-10 flex min-h-screen flex-col">
        {header}
        <main className={clsx('flex flex-1', className)} {...props} />
      </div>
      {footer ? <div className="relative z-10">{footer}</div> : null}
    </>
  );
}

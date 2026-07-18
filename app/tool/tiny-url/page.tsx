import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Page } from '@/components/layout/Page';
import { TinyUrlForm } from '@/components/tiny-url/TinyUrlForm';
import { Link as LinkIcon } from 'lucide-react';

export default function TinyUrlPage() {
  return (
    <Page header={<Header />} footer={<Footer />}>
      <Container className="flex items-center py-12 sm:py-20">
        <section className="mx-auto w-full max-w-2xl rounded-3xl border bg-surface p-6 shadow-surface sm:p-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <LinkIcon className="size-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Tiny URL
            </h1>
            <p className="mt-3 max-w-lg text-muted">
              Вставь длинную ссылку — получишь короткую ссылку на этом домене.
            </p>
          </div>

          <TinyUrlForm />
        </section>
      </Container>
    </Page>
  );
}

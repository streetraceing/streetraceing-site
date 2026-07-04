import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Page } from '@/components/layout/Page';

export default function TinyUrlPage() {
  return (
    <Page header={<Header />} footer={<Footer />}>
      <Container>

      </Container>
    </Page>
  );
}

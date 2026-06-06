import { Container } from '@/components/Container';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Page } from '@/components/Page';
import { Typography } from '@heroui/react';

export default function HomePage() {
  return (
    <Page header={<Header />} footer={<Footer />}>
      <Container className="py-4">
        <Typography.Paragraph>test</Typography.Paragraph>
      </Container>
    </Page>
  );
}

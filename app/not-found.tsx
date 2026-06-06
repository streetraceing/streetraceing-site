import { Container } from '@/components/Container';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Page } from '@/components/Page';
import { Separator, Typography } from '@heroui/react';

export default function NotFound() {
  return (
    <Page header={<Header />} footer={<Footer />}>
      <Container className="flex justify-center items-center">
        <div className="flex gap-4 items-center">
          <Typography.Heading level={4}>404</Typography.Heading>
          <Separator orientation="vertical" />
          <Typography.Paragraph>Не найдено</Typography.Paragraph>
        </div>
      </Container>
    </Page>
  );
}

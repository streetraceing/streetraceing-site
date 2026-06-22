import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Page } from '@/components/layout/Page';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { projectSizeClasses } from '@/utils';
import { mainPageConfig } from '@/utils/site';
import { Button, cn, Modal, Typography } from '@heroui/react';
import { Rocket } from 'lucide-react';
import Link from 'next/link';
import { FaGithub } from 'react-icons/fa6';

export default function HomePage() {
  return (
    <Page header={<Header />} footer={<Footer />}>
      <Container className="py-4 gap-4 flex flex-col">
        <Typography.Paragraph>
          Ээ даже хз что сюда писать и размещать но похъ
        </Typography.Paragraph>
        <section
          id="bio-section"
          className="scroll-mt-16 flex flex-col gap-4 pt-4 border-t"
        >
          <Typography.Heading level={3}>
            Вот моя биография йоу
          </Typography.Heading>

          <div className="flex gap-4 h-fit flex-col md:flex-row md:h-48">
            <ProfileAvatar />
            <div className="flex flex-col">
              <Typography.Heading level={3}>Если кратко то</Typography.Heading>
              <Typography.Paragraph>Зовут Андрей, 18 лет</Typography.Paragraph>
            </div>
          </div>
        </section>
        <section
          id="project-section"
          className="scroll-mt-16 flex flex-col gap-4 pt-4 border-t"
        >
          <Typography.Heading level={3}>
            А вот мои проекты ({mainPageConfig.projects.length}) кста
          </Typography.Heading>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mainPageConfig.projects.map((project) => (
              <Modal key={project.name}>
                <Modal.Trigger className={cn(projectSizeClasses[project.size])}>
                  <div
                    className={cn(
                      'rounded-lg p-4 gap-4 flex justify-between flex-col md:flex-row bg-default-soft hover:bg-default-hover/75 transition-colors',
                    )}
                  >
                    <div className="flex flex-col gap-2">
                      <Typography.Heading level={4}>
                        {project.name}
                      </Typography.Heading>
                      <Typography.Paragraph className="text-muted">
                        {project.description}
                      </Typography.Paragraph>
                    </div>

                    {project.links.github && (
                      <Link
                        href={project.links.github}
                        className="button button--primary button--md"
                      >
                        <FaGithub />
                        Github
                      </Link>
                    )}
                  </div>
                </Modal.Trigger>
                <Modal.Backdrop>
                  <Modal.Container>
                    <Modal.Dialog className="sm:max-w-90">
                      <Modal.CloseTrigger />
                      <Modal.Header>
                        <Modal.Icon className="bg-default text-foreground">
                          <Rocket className="size-5" />
                        </Modal.Icon>
                        <Modal.Heading>Welcome to HeroUI</Modal.Heading>
                      </Modal.Header>
                      <Modal.Body>
                        <p>
                          A beautiful, fast, and modern React UI library for
                          building accessible and customizable web applications
                          with ease.
                        </p>
                      </Modal.Body>
                      <Modal.Footer>
                        <Button className="w-full" slot="close">
                          Continue
                        </Button>
                      </Modal.Footer>
                    </Modal.Dialog>
                  </Modal.Container>
                </Modal.Backdrop>
              </Modal>
            ))}
          </div>
        </section>

        <section
          id="tool-section"
          className="scroll-mt-16 flex flex-col gap-4 pt-4 border-t"
        >
          <Typography.Heading level={3}>
            Инструменты ({mainPageConfig.tools.length}) чиста для удобства
          </Typography.Heading>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mainPageConfig.tools.map((tool) => (
              <Link
                key={tool.name}
                href={`/tool/${tool.url}`}
                className={cn(
                  'rounded-lg bg-default-soft hover:bg-default-hover/75 p-4 gap-4 flex justify-between flex-col md:flex-row transition-colors',
                  projectSizeClasses[tool.size],
                )}
              >
                <div className="flex flex-col gap-2">
                  <Typography.Heading
                    className="flex gap-2 items-center"
                    level={4}
                  >
                    {tool.icon && <tool.icon className="size-5" />}
                    {tool.name}
                  </Typography.Heading>
                  <Typography.Paragraph className="text-muted">
                    {tool.description}
                  </Typography.Paragraph>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </Container>
    </Page>
  );
}

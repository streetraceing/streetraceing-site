import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Page } from '@/components/layout/Page';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { projectSizeClasses } from '@/utils';
import { mainPageConfig } from '@/utils/config';
import { cn, Modal, Typography } from '@heroui/react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <Page header={<Header />} footer={<Footer />}>
      <Container className="py-4 gap-4 flex flex-col">
        <Typography.Paragraph>
          Ээ даже хз что сюда писать и размещать но похъ
        </Typography.Paragraph>

        <section
          id="bio"
          className="scroll-mt-16 flex flex-col gap-4 pt-4 border-t"
        >
          <Typography.Heading level={3}>
            Вот моя биография йоу
          </Typography.Heading>

          <div className="flex gap-4 h-fit flex-col md:flex-row md:h-48">
            <ProfileAvatar />
            <div className="flex flex-col">
              <Typography.Paragraph>
                Зовут Андрей, 18 лет, люблю программирование, дизайн и лигу
                легенд. В основном играю в игры и учусь в университете, немного
                увлекаюсь рисованием .-. <br />
                Программировать начал с лет 10, создавая дискорд ботов с
                discordjs, а после уже и пошли программы с tauri, вебсайты,
                бэкенды и тд. Я себя идентифицирую как фуллстак :) <br />
                Умею работать с git, docker, бдшками, линуском (ну так по
                мелочи). Из языков я знаю javascript + typescript, java, учу c#,
                влюблен в rust (кек). <br /> В последнее время увлекаюсь иишками
                и работой с ними.
              </Typography.Paragraph>
            </div>
          </div>
        </section>

        <section
          id="projects"
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
                      <Typography.Heading
                        className="flex gap-2 items-center"
                        level={4}
                      >
                        {project.icon && <project.icon className="size-5" />}
                        {project.name}
                      </Typography.Heading>
                      <Typography.Paragraph className="text-muted">
                        {project.shortDescription}
                      </Typography.Paragraph>
                    </div>
                  </div>
                </Modal.Trigger>
                <Modal.Backdrop>
                  <Modal.Container>
                    <Modal.Dialog className="sm:max-w-90">
                      <Modal.CloseTrigger />
                      <Modal.Header>
                        {project.icon && (
                          <Modal.Icon className="bg-default text-foreground">
                            <project.icon className="size-5" />
                          </Modal.Icon>
                        )}
                        <Modal.Heading>{project.name}</Modal.Heading>
                      </Modal.Header>
                      <Modal.Body>{project.longDescription}</Modal.Body>
                      <Modal.Footer className="flex flex-col">
                        {project.links.map((link) => (
                          <Link
                            key={link.url}
                            href={link.url}
                            className="button button--primary button--md w-full"
                          >
                            <link.icon />
                            {link.label}
                          </Link>
                        ))}

                        {project.relatedLinks.length > 0 &&
                          project.links.length > 0 && (
                            <Typography.Paragraph
                              size="xs"
                              className="text-muted-foreground"
                            >
                              связанное
                            </Typography.Paragraph>
                          )}

                        {project.relatedLinks.map((link) => (
                          <Link
                            key={link.url}
                            href={link.url}
                            className="button button--tertiary button--md w-full"
                          >
                            <link.icon />
                            {link.label}
                          </Link>
                        ))}
                      </Modal.Footer>
                    </Modal.Dialog>
                  </Modal.Container>
                </Modal.Backdrop>
              </Modal>
            ))}
          </div>
        </section>

        <section
          id="tools"
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

import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Page } from '@/components/layout/Page';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ToolCard } from '@/components/projects/ToolCard';
import { StatsSection } from '@/components/stats/StatsSection';
import { mainPageConfig } from '@/utils/config';
import { Typography } from '@heroui/react';

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

        <StatsSection />

        <section
          id="projects"
          className="scroll-mt-16 flex flex-col gap-4 pt-4 border-t"
        >
          <Typography.Heading level={3}>
            А вот мои проекты ({mainPageConfig.projects.length}) кста
          </Typography.Heading>

          <div className="flex flex-col gap-4">
            {mainPageConfig.projects.map((project) => (
              <ProjectCard key={project.slug} project={project} />
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

          <div className="flex flex-col gap-4">
            {mainPageConfig.tools.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </section>
      </Container>
    </Page>
  );
}

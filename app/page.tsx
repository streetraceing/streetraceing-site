import { Container } from '@/components/Container';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Page } from '@/components/Page';
import { cn, Typography } from '@heroui/react';
import Link from 'next/link';
import { FaGithub } from 'react-icons/fa';

type Size = 'sm' | 'md' | 'lg';

type Config = {
  projects: {
    name: string;
    size: Size;
    description: string;
    colors: string[];
    links: {
      github?: string;
    };
  }[];
};

const projectSizeClasses: Record<Size, string> = {
  sm: 'md:col-span-1 md:row-span-1',
  md: 'md:col-span-2 md:row-span-1',
  lg: 'md:col-span-3 md:row-span-1',
} as const;

export function createProjectGradient(...colors: string[]) {
  const stops = colors.map((color, index) => {
    const percent = Math.round((index / (colors.length - 1)) * 100);

    return `${color} ${percent}%`;
  });

  return {
    background: `linear-gradient(135deg, ${stops.join(', ')})`,
  };
}

export default function HomePage() {
  const config: Config = {
    projects: [
      {
        name: 'Luminous',
        description:
          'Красивая тема для Spotify (используя spicetify) с динамическим фоном, который устанавливается отталкиваясь от текущей песни.',
        size: 'lg',
        colors: ['#040503', '#767a7b', '#684f36'],
        links: {
          github: 'https://github.com/streetraceing/luminous',
        },
      },
    ],
  };

  return (
    <Page header={<Header />} footer={<Footer />}>
      <Container className="py-4 gap-4 flex flex-col">
        <Typography.Paragraph>
          Ээ даже хз что сюда писать и размещать но похъ
        </Typography.Paragraph>

        <div className="flex flex-col gap-4">
          <Typography.Heading level={2}>
            Вот мои проекты например
          </Typography.Heading>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {config.projects.map((project) => (
              <div
                key={project.name}
                className={cn(
                  'rounded-lg border p-4 gap-4 flex flex-col justify-between',
                  projectSizeClasses[project.size],
                )}
                style={createProjectGradient(...project.colors)}
              >
                <div>
                  <Typography.Heading level={3}>
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
            ))}
          </div>
        </div>
      </Container>
    </Page>
  );
}

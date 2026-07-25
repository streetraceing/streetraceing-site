import { text, type LocalizedText } from '@/utils/i18n';
import { BrainCircuit, Database } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  SiDocker,
  SiGit,
  SiGithubactions,
  SiLinux,
  SiMariadb,
  SiMongodb,
  SiNestjs,
  SiNextdotjs,
  SiOpenjdk,
  SiPostgresql,
  SiPython,
  SiReact,
  SiRust,
  SiSharp,
  SiTypescript,
  SiVite,
} from 'react-icons/si';
import type { IconType } from 'react-icons';

export type SkillIcon = LucideIcon | IconType;
export type SkillVariant =
  'blue' | 'green' | 'red' | 'purple' | 'gray' | 'yellow';

export type SkillStyle = {
  chip: string;
  card: string;
  icon: string;
};

type BiographySkill = {
  id: string;
  label: string;
  icon: SkillIcon;
};

type BiographySkillGroup = {
  id: string;
  label: LocalizedText;
  variant: SkillVariant;
  skills: readonly BiographySkill[];
};

export const biographySkillGroups = [
  {
    id: 'languages',
    label: text('Языки программирования', 'Programming languages'),
    variant: 'blue',
    skills: [
      { id: 'typescript', label: 'TypeScript', icon: SiTypescript },
      { id: 'java', label: 'Java', icon: SiOpenjdk },
      { id: 'csharp', label: 'C#', icon: SiSharp },
      { id: 'rust', label: 'Rust', icon: SiRust },
      { id: 'python', label: 'Python', icon: SiPython },
    ],
  },
  {
    id: 'frontend',
    label: text('Фронтенд', 'Frontend'),
    variant: 'green',
    skills: [
      { id: 'react', label: 'React', icon: SiReact },
      { id: 'vite', label: 'Vite', icon: SiVite },
      { id: 'nextjs', label: 'next.js', icon: SiNextdotjs },
    ],
  },
  {
    id: 'databases',
    label: text('Базы данных', 'Databases'),
    variant: 'red',
    skills: [
      { id: 'sql', label: 'SQL', icon: Database },
      { id: 'postgresql', label: 'PostgreSQL', icon: SiPostgresql },
      { id: 'mongodb', label: 'MongoDB', icon: SiMongodb },
      { id: 'mariadb', label: 'MariaDB', icon: SiMariadb },
    ],
  },

  {
    id: 'backend',
    label: text('Бэкенд', 'Backend'),
    variant: 'purple',
    skills: [{ id: 'nestjs', label: 'NestJS', icon: SiNestjs }],
  },
  {
    id: 'ai',
    label: text('AI и автоматизация', 'AI and automation'),
    variant: 'gray',
    skills: [{ id: 'ai', label: 'AI', icon: BrainCircuit }],
  },
  {
    id: 'infrastructure',
    label: text('Инфраструктура', 'Infrastructure'),
    variant: 'yellow',
    skills: [
      { id: 'linux', label: 'Linux', icon: SiLinux },
      { id: 'docker', label: 'Docker', icon: SiDocker },
      { id: 'git', label: 'Git', icon: SiGit },
      { id: 'cicd', label: 'CI/CD', icon: SiGithubactions },
    ],
  },
] as const satisfies readonly BiographySkillGroup[];

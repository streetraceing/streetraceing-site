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
export type SkillTone = 'accent' | 'success' | 'warning' | 'danger' | 'default';

type BiographySkill = {
  id: string;
  label: string;
  icon: SkillIcon;
};

type BiographySkillGroup = {
  id: string;
  label: LocalizedText;
  tone: SkillTone;
  skills: readonly BiographySkill[];
};

export const biographySkillGroups = [
  {
    id: 'languages',
    label: text('Языки программирования', 'Programming languages'),
    tone: 'accent',
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
    tone: 'success',
    skills: [
      { id: 'react', label: 'React', icon: SiReact },
      { id: 'vite', label: 'Vite', icon: SiVite },
    ],
  },
  {
    id: 'databases',
    label: text('Базы данных', 'Databases'),
    tone: 'danger',
    skills: [
      { id: 'sql', label: 'SQL', icon: Database },
      { id: 'postgresql', label: 'PostgreSQL', icon: SiPostgresql },
      { id: 'mongodb', label: 'MongoDB', icon: SiMongodb },
      { id: 'mariadb', label: 'MariaDB', icon: SiMariadb },
    ],
  },
  {
    id: 'infrastructure',
    label: text('Инфраструктура', 'Infrastructure'),
    tone: 'warning',
    skills: [
      { id: 'linux', label: 'Linux', icon: SiLinux },
      { id: 'docker', label: 'Docker', icon: SiDocker },
      { id: 'git', label: 'Git', icon: SiGit },
      { id: 'cicd', label: 'CI/CD', icon: SiGithubactions },
    ],
  },
  {
    id: 'ai',
    label: text('AI и автоматизация', 'AI and automation'),
    tone: 'default',
    skills: [{ id: 'ai', label: 'AI', icon: BrainCircuit }],
  },
] as const satisfies readonly BiographySkillGroup[];

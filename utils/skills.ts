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

export const biographySkills = [
  { id: 'typescript', label: 'TypeScript', icon: SiTypescript, tone: 'accent' },
  { id: 'java', label: 'Java', icon: SiOpenjdk, tone: 'warning' },
  { id: 'csharp', label: 'C#', icon: SiSharp, tone: 'success' },
  { id: 'linux', label: 'Linux', icon: SiLinux, tone: 'default' },
  { id: 'docker', label: 'Docker', icon: SiDocker, tone: 'accent' },
  { id: 'git', label: 'Git', icon: SiGit, tone: 'danger' },
  { id: 'rust', label: 'Rust', icon: SiRust, tone: 'warning' },
  { id: 'cicd', label: 'CI/CD', icon: SiGithubactions, tone: 'success' },
  { id: 'ai', label: 'AI', icon: BrainCircuit, tone: 'accent' },
  { id: 'python', label: 'Python', icon: SiPython, tone: 'warning' },
  { id: 'sql', label: 'SQL', icon: Database, tone: 'default' },
  {
    id: 'postgresql',
    label: 'PostgreSQL',
    icon: SiPostgresql,
    tone: 'accent',
  },
  { id: 'mongodb', label: 'MongoDB', icon: SiMongodb, tone: 'success' },
  { id: 'mariadb', label: 'MariaDB', icon: SiMariadb, tone: 'warning' },
  { id: 'react', label: 'React', icon: SiReact, tone: 'accent' },
  { id: 'vite', label: 'Vite', icon: SiVite, tone: 'danger' },
] as const;

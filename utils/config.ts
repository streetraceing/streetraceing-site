import {
  Braces,
  ExternalLink,
  FileText,
  FolderOpen,
  Hammer,
  Home,
  KeyRound,
  LucideIcon,
  Sparkles,
} from 'lucide-react';
import { IconType } from 'react-icons';
import { FaGithub, FaSpotify, FaTelegram, FaVk } from 'react-icons/fa6';

// global config

export const siteConfig = {
  name: 'streetraceing',
  description: 'Мой личный (х)уютный сайтик',
} as const;

// main page config

export type Size = 'sm' | 'md' | 'lg';

export type AnyIcon = LucideIcon | IconType;

export type ProjectStatus =
  | 'in-development'
  | 'released'
  | 'private'
  | 'closed-source'
  | 'open-source';

export type ProjectLink = {
  url: string;
  icon: AnyIcon;
  label: string;
};

export type ProjectScreenshot = {
  src: string;
  alt: string;
  caption?: string;
};

export type ProjectDevLogEntry = {
  date: string;
  title: string;
  description?: string;
};

export type ProjectConfig = {
  slug: string;
  name: string;
  size: Size;
  shortDescription: string;
  longDescription: string;
  colors: string[];
  status: ProjectStatus[];
  progress: number;
  technologies: string[];
  highlights: string[];
  links: ProjectLink[];
  relatedLinks: ProjectLink[];
  screenshots?: ProjectScreenshot[];
  devLog?: ProjectDevLogEntry[];
  icon?: AnyIcon;
};

export type ToolStatus = 'available' | 'planned';

export type ToolConfig = {
  slug: string;
  size: Size;
  icon?: AnyIcon;
  name: string;
  description: string;
  status: ToolStatus;
  tags: string[];
};

export type MainPageConfig = {
  projects: ProjectConfig[];
  tools: ToolConfig[];
};

export const mainPageConfig: MainPageConfig = {
  projects: [
    {
      slug: 'luminous',
      name: 'Luminous',
      icon: FaSpotify,
      shortDescription: 'Лёгкая динамическая тема для Spicetify',
      longDescription:
        'Красивая тема для Spotify через Spicetify с динамическим фоном, который подстраивается под текущий трек.',
      size: 'lg',
      colors: ['#040503', '#767a7b', '#684f36'],
      status: ['released', 'open-source'],
      progress: 100,
      technologies: ['Spicetify', 'JavaScript', 'CSS'],
      highlights: [
        'Динамический фон по обложке текущего трека',
        'Лёгкий способ освежить интерфейс Spotify',
      ],
      links: [
        {
          url: 'https://github.com/streetraceing/luminous',
          icon: FaGithub,
          label: 'Github',
        },
      ],
      relatedLinks: [
        {
          url: 'https://spicetify.app/',
          icon: FaSpotify,
          label: 'Spicetify',
        },
      ],
    },
    {
      slug: 'tikflowlybot',
      name: 'Tikflowlybot',
      icon: FaTelegram,
      shortDescription:
        'Telegram-бот для быстрого скачивания видео из TikTok по ссылке.',
      longDescription:
        'Простой и удобный Telegram-бот: отправляешь ссылку на ролик из TikTok — получаешь видео для сохранения. Исходный код проекта закрыт.',
      size: 'md',
      colors: ['#0b1120', '#1394a6', '#22c55e'],
      status: ['released', 'closed-source'],
      progress: 100,
      technologies: ['Telegram', 'TikTok', 'TypeScript'],
      highlights: [
        'Скачивание роликов по одной ссылке',
        'Работает прямо в привычном интерфейсе Telegram',
      ],
      links: [
        {
          url: 'https://t.me/tikflowlybot',
          icon: FaTelegram,
          label: 'Открыть бота',
        },
      ],
      relatedLinks: [],
    },
    {
      slug: 'miyuki',
      name: 'Miyuki',
      icon: Sparkles,
      shortDescription:
        'Приватный AI-сервис для естественной переписки через личный Telegram-аккаунт.',
      longDescription:
        'TypeScript-сервис, который работает через MTProto и @mtcute от имени авторизованного Telegram-аккаунта. Он хранит контекст в PostgreSQL и использует несколько AI-провайдеров для анализа, принятия решений и генерации ответов — чтобы переписка ощущалась живой и последовательной.',
      size: 'lg',
      colors: ['#21133e', '#a855f7', '#f472b6'],
      status: ['in-development', 'private', 'closed-source'],
      progress: 70,
      technologies: ['TypeScript', 'MTProto', '@mtcute', 'PostgreSQL', 'AI'],
      highlights: [
        'Работает не через Bot API, а от имени личного аккаунта',
        'Сохраняет контекст диалогов в PostgreSQL',
        'Объединяет несколько AI-провайдеров для разных этапов ответа',
      ],
      links: [],
      relatedLinks: [],
    },
  ],
  tools: [
    {
      slug: 'tiny-url',
      name: 'Tiny data',
      description:
        'Сохраняй ссылку, текст или другие данные и получай короткий адрес.',
      size: 'lg',
      icon: ExternalLink,
      status: 'available',
      tags: ['PostgreSQL', 'Cookies', 'Текст'],
    },
    {
      slug: 'json-viewer',
      name: 'JSON Viewer',
      description:
        'Проверка, форматирование и удобный просмотр JSON без лишних сервисов.',
      size: 'md',
      icon: Braces,
      status: 'planned',
      tags: ['JSON', 'Форматирование'],
    },
    {
      slug: 'uuid-generator',
      name: 'UUID Generator',
      description: 'Генератор UUID для тестовых данных, API и баз данных.',
      size: 'md',
      icon: KeyRound,
      status: 'planned',
      tags: ['UUID', 'Dev'],
    },
    {
      slug: 'text-tools',
      name: 'Text tools',
      description:
        'Набор маленьких операций с текстом: счётчик, очистка и преобразования.',
      size: 'md',
      icon: FileText,
      status: 'planned',
      tags: ['Текст', 'Утилиты'],
    },
  ],
};

// header config

export type HeaderConfig = {
  links: {
    icon: AnyIcon;
    label: string;
    href: string;
  }[];
};

export const headerConfig: HeaderConfig = {
  links: [
    {
      icon: Home,
      label: 'Биография',
      href: '/#bio',
    },
    {
      icon: FolderOpen,
      label: 'Проекты',
      href: '/#projects',
    },
    {
      icon: Hammer,
      label: 'Инструменты',
      href: '/#tools',
    },
  ],
};

// footer config

export type FooterConfig = {
  links: {
    label: string;
    href: string;
    icon?: AnyIcon;
  }[];
};

export const footerConfig: FooterConfig = {
  links: [
    {
      icon: FaTelegram,
      label: 'Telegram',
      href: 'https://t.me/streetraceing',
    },
    {
      icon: FaVk,
      label: 'ВКонтакте',
      href: 'https://vk.com/streetraceing',
    },
    {
      icon: FaGithub,
      label: 'Github',
      href: 'https://github.com/streetraceing',
    },
    {
      icon: FaSpotify,
      label: 'Spotify',
      href: 'https://open.spotify.com/user/lqm56l2b0txw9ria2mm2tc086',
    },
  ],
};

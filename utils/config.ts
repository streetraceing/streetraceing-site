import {
  Bot,
  Braces,
  BarChart3,
  Code2,
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

import { type LocalizedText, text } from '@/utils/i18n';

// global config

export const siteConfig = {
  name: 'streetraceing',
  description: text(
    'Мой личный (х)уютный сайтик',
    'My personal cozy little website',
  ),
} as const;

// main page config

export type AnyIcon = LucideIcon | IconType;

export type ProjectStatus =
  | 'in-development'
  | 'released'
  | 'private'
  | 'closed-source'
  | 'open-source'
  | 'maintained'
  | 'archived'
  | 'paused'
  | 'planned'
  | 'beta';

export type ProjectLink = {
  url: string;
  icon: AnyIcon;
  label: LocalizedText;
};

export type ProjectScreenshot = {
  src: string;
  alt: LocalizedText;
  caption?: LocalizedText;
};

export type ProjectDevLogEntry = {
  date: string;
  title: LocalizedText;
  description?: LocalizedText;
};

export type ProjectConfig = {
  slug: string;
  name: string;
  shortDescription: LocalizedText;
  longDescription: LocalizedText;
  colors: string[];
  status: ProjectStatus[];
  progress: number;
  technologies: string[];
  highlights: LocalizedText[];
  links: ProjectLink[];
  relatedLinks: ProjectLink[];
  screenshots?: ProjectScreenshot[];
  devLog?: ProjectDevLogEntry[];
  icon?: AnyIcon;
};

export type ToolStatus = 'available' | 'planned';

export type ToolConfig = {
  slug: string;
  icon?: AnyIcon;
  name: LocalizedText;
  description: LocalizedText;
  status: ToolStatus;
  tags: LocalizedText[];
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
      shortDescription: text(
        'Лёгкая динамическая тема для Spicetify',
        'A lightweight dynamic theme for Spicetify',
      ),
      longDescription: text(
        'Красивая тема для Spotify через Spicetify с динамическим фоном, который подстраивается под текущий трек.',
        'A beautiful Spotify theme for Spicetify with a dynamic background that adapts to the current track.',
      ),
      colors: ['#73724E', '#767a7b', '#684f36'],
      status: ['released', 'maintained', 'open-source'],
      progress: 100,
      technologies: ['Spicetify', 'JavaScript', 'CSS'],
      highlights: [
        text(
          'Динамический фон по обложке текущего трека',
          'A dynamic background based on the current track cover',
        ),
        text(
          'Лёгкий способ освежить интерфейс Spotify',
          'An easy way to refresh the Spotify interface',
        ),
      ],
      links: [
        {
          url: 'https://github.com/streetraceing/luminous',
          icon: FaGithub,
          label: text('GitHub', 'GitHub'),
        },
      ],
      relatedLinks: [
        {
          url: 'https://spicetify.app/',
          icon: FaSpotify,
          label: text('Spicetify', 'Spicetify'),
        },
      ],
    },
    {
      slug: 'tikflowlybot',
      name: 'Tikflowlybot',
      icon: FaTelegram,
      shortDescription: text(
        'Telegram-бот для быстрого скачивания видео из TikTok по ссылке.',
        'A Telegram bot for quickly downloading TikTok videos from a link.',
      ),
      longDescription: text(
        'Простой и удобный Telegram-бот: отправляешь ссылку на ролик из TikTok — получаешь видео для сохранения. Исходный код проекта закрыт.',
        'A simple, convenient Telegram bot: send a TikTok video link and get the video to save. The source code is closed.',
      ),
      colors: ['#1C2C54', '#1394a6', '#22c55e'],
      status: ['released', 'maintained', 'closed-source'],
      progress: 100,
      technologies: ['Telegram', 'TikTok', 'TypeScript'],
      highlights: [
        text(
          'Скачивание роликов по одной ссылке',
          'Downloads videos from a single link',
        ),
        text(
          'Работает прямо в привычном интерфейсе Telegram',
          'Works right inside the familiar Telegram interface',
        ),
      ],
      links: [
        {
          url: 'https://t.me/tikflowlybot',
          icon: FaTelegram,
          label: text('Открыть бота', 'Open bot'),
        },
      ],
      relatedLinks: [],
    },
    {
      slug: 'miyuki',
      name: 'Miyuki',
      icon: Sparkles,
      shortDescription: text(
        'Приватный AI-сервис для естественной переписки через личный Telegram-аккаунт.',
        'A private AI service for natural conversations through a personal Telegram account.',
      ),
      longDescription: text(
        'TypeScript-сервис, который работает через MTProto и @mtcute от имени авторизованного Telegram-аккаунта. Он хранит контекст в PostgreSQL и использует несколько AI-провайдеров для анализа, принятия решений и генерации ответов — чтобы переписка ощущалась живой и последовательной.',
        'A TypeScript service that uses MTProto and @mtcute on behalf of an authorized Telegram account. It stores context in PostgreSQL and uses multiple AI providers for analysis, decisions, and response generation, making conversations feel natural and consistent.',
      ),
      colors: ['#21133e', '#a855f7', '#f472b6'],
      status: ['in-development', 'maintained', 'private', 'closed-source'],
      progress: 70,
      technologies: ['TypeScript', 'MTProto', '@mtcute', 'PostgreSQL', 'AI'],
      highlights: [
        text(
          'Работает не через Bot API, а от имени личного аккаунта',
          'Works through a personal account rather than the Bot API',
        ),
        text(
          'Сохраняет контекст диалогов в PostgreSQL',
          'Stores conversation context in PostgreSQL',
        ),
        text(
          'Объединяет несколько AI-провайдеров для разных этапов ответа',
          'Combines several AI providers for different response stages',
        ),
      ],
      links: [],
      relatedLinks: [],
    },
    {
      slug: 'symmetry',
      name: 'Symmetry',
      icon: Bot,
      shortDescription: text(
        'Будущее open-source расширение VS Code с бесплатным AI-агентом для разработки.',
        'A future open-source VS Code extension with a free AI coding agent.',
      ),
      longDescription: text(
        'Symmetry — будущий бесплатный AI-агент в формате расширения для VS Code. Он сможет работать с локальными моделями и бесплатными AI-сервисами, например Ollama, Mistral или Cloudflare AI, чтобы помогать с кодом прямо в редакторе.',
        'Symmetry is a future free AI agent as a VS Code extension. It will work with local models and free AI services such as Ollama, Mistral, or Cloudflare AI to help directly in the editor.',
      ),
      colors: ['#0b1f3a', '#2563eb', '#38bdf8'],
      status: ['in-development', 'maintained', 'open-source'],
      progress: 0,
      technologies: [
        'VS Code',
        'TypeScript',
        'Ollama',
        'Mistral',
        'Cloudflare AI',
      ],
      highlights: [
        text(
          'Локальные модели через Ollama без обязательной оплаты',
          'Local models through Ollama without mandatory payment',
        ),
        text(
          'Подключение бесплатных AI-провайдеров как альтернатива локальной модели',
          'Free AI providers as an alternative to a local model',
        ),
        text(
          'Агентный интерфейс для помощи с кодом прямо в VS Code',
          'An agent interface that helps with code directly in VS Code',
        ),
      ],
      links: [],
      relatedLinks: [],
    },
  ],
  tools: [
    {
      slug: 'tiny-url',
      name: text('Tiny URL и другие данные', 'Tiny URL and other data'),
      description: text(
        'Сохраняй ссылку, текст или другие данные и получай короткий адрес.',
        'Save a link, text, or other data and get a short address.',
      ),
      icon: ExternalLink,
      status: 'available',
      tags: [
        text('PostgreSQL', 'PostgreSQL'),
        text('Cookies', 'Cookies'),
        text('Текст', 'Text'),
      ],
    },
    {
      slug: 'json-viewer',
      name: text('JSON Viewer', 'JSON Viewer'),
      description: text(
        'Проверка, форматирование и удобный просмотр JSON без лишних сервисов.',
        'Validate, format, and inspect JSON without extra services.',
      ),
      icon: Braces,
      status: 'available',
      tags: [
        text('JSON', 'JSON'),
        text('Форматирование', 'Formatting'),
        text('Клиент', 'Client'),
      ],
    },
    {
      slug: 'uuid-generator',
      name: text('Генератор UUID', 'UUID Generator'),
      description: text(
        'Генератор UUID для тестовых данных, API и баз данных.',
        'Generate UUIDs for test data, APIs, and databases.',
      ),
      icon: KeyRound,
      status: 'available',
      tags: [
        text('UUID', 'UUID'),
        text('Разработка', 'Dev'),
        text('Клиент', 'Client'),
      ],
    },
    {
      slug: 'text-tools',
      name: text('Инструменты текста', 'Text tools'),
      description: text(
        'Набор маленьких операций с текстом: счётчик, очистка и преобразования.',
        'A set of small text operations: counting, cleanup, and transforms.',
      ),
      icon: FileText,
      status: 'available',
      tags: [
        text('Текст', 'Text'),
        text('Утилиты', 'Utilities'),
        text('Клиент', 'Client'),
      ],
    },
    {
      slug: 'base64',
      name: text('Base64', 'Base64'),
      description: text(
        'Кодирование и декодирование текста в Base64 прямо в браузере.',
        'Encode and decode text as Base64 directly in the browser.',
      ),
      icon: Code2,
      status: 'available',
      tags: [
        text('Base64', 'Base64'),
        text('Код', 'Code'),
        text('Клиент', 'Client'),
      ],
    },
  ],
};

// header config

export type HeaderConfig = {
  links: {
    icon: AnyIcon;
    label: LocalizedText;
    href: string;
  }[];
};

export const headerConfig: HeaderConfig = {
  links: [
    {
      icon: Home,
      label: text('Биография', 'About'),
      href: '/#bio',
    },
    {
      icon: BarChart3,
      label: text('Статистика', 'Stats'),
      href: '/#stats',
    },
    {
      icon: FolderOpen,
      label: text('Проекты', 'Projects'),
      href: '/#projects',
    },
    {
      icon: Hammer,
      label: text('Инструменты', 'Tools'),
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

import {
  Bot,
  Braces,
  BarChart3,
  CalendarClock,
  Clock3,
  Code2,
  ExternalLink,
  FileCode2,
  FileText,
  Fingerprint,
  FolderOpen,
  GitCompareArrows,
  Hammer,
  Home,
  KeyRound,
  LucideIcon,
  Package,
  Link2,
  PackageSearch,
  Palette,
  Regex,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { IconType } from 'react-icons';
import { FaGithub, FaSpotify, FaTelegram, FaVk } from 'react-icons/fa6';

import { type LocalizedText, text } from '@/utils/i18n';

// global config

export { siteConfig } from '@/utils/site';

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
  /** HTTPS URL of the source Markdown rendered on the dedicated project page. */
  documentationUrl?: string;
  icon?: AnyIcon;
};

export type ToolStatus = 'available' | 'planned';
export type GenericToolComponent =
  | 'json-viewer'
  | 'uuid-generator'
  | 'text-tools'
  | 'base64'
  | 'password-generator'
  | 'jwt-inspector'
  | 'hash-generator'
  | 'regex-tester'
  | 'url-inspector'
  | 'timestamp-converter'
  | 'json-to-typescript'
  | 'text-diff'
  | 'color-contrast'
  | 'cron-builder';

export type ToolConfig = {
  slug: string;
  icon?: AnyIcon;
  name: LocalizedText;
  description: LocalizedText;
  status: ToolStatus;
  component?: GenericToolComponent;
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
      documentationUrl:
        'https://raw.githubusercontent.com/streetraceing/luminous/refs/heads/main/docs/README.md',
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
        'Простой и удобный Telegram-бот: отправляешь ссылку на ролик из TikTok - получаешь видео для сохранения. Исходный код проекта закрыт.',
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
        'TypeScript-сервис, который работает через MTProto и @mtcute от имени авторизованного Telegram-аккаунта. Он хранит контекст в PostgreSQL и использует несколько AI-провайдеров для анализа, принятия решений и генерации ответов - чтобы переписка ощущалась живой и последовательной.',
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
      slug: 'farsight',
      name: 'Farsight',
      icon: PackageSearch,
      shortDescription: text(
        'TypeScript CLI для быстрого глубокого обзора JavaScript-проектов.',
        'A TypeScript CLI for a fast, in-depth overview of JavaScript projects.',
      ),
      longDescription: text(
        'Farsight анализирует зависимости npm, строки исходного кода, тип проекта и локальную Git-активность. Инструмент запускается через npx, поддерживает JSON-вывод и режим без сети.',
        'Farsight analyzes npm dependency freshness, source lines, project type, and local Git activity. It runs through npx and supports JSON output and an offline mode.',
      ),
      colors: ['#111827', '#4f46e5', '#22d3ee'],
      status: ['released', 'maintained', 'open-source'],
      progress: 100,
      technologies: ['TypeScript', 'Node.js', 'npm', 'Git', 'CLI'],
      highlights: [
        text(
          'Показывает current, wanted и latest версии прямых npm-зависимостей',
          'Shows current, wanted, and latest versions of direct npm dependencies',
        ),
        text(
          'Считает физические и непустые строки исходного кода',
          'Counts physical and non-empty source lines',
        ),
        text(
          'Собирает локальную Git-активность и статистику участников',
          'Collects local Git activity and contributor statistics',
        ),
      ],
      links: [
        {
          url: 'https://github.com/streetraceing/farsight',
          icon: FaGithub,
          label: text('GitHub', 'GitHub'),
        },
        {
          url: 'https://www.npmjs.com/package/@streetraceing/farsight',
          icon: PackageSearch,
          label: text('npm', 'npm'),
        },
      ],
      relatedLinks: [],
      documentationUrl:
        'https://raw.githubusercontent.com/streetraceing/farsight/refs/heads/main/docs/README.md',
    },
    {
      slug: 'package',
      name: 'Package',
      icon: Package,
      shortDescription: text(
        'TypeScript CLI для ZIP-упаковки и управления проектами.',
        'A TypeScript CLI for ZIP packaging and project management.',
      ),
      longDescription: text(
        'Package помогает собирать проекты в ZIP-архивы и управлять настройками упаковки через понятный конфиг.',
        'Package helps bundle projects into ZIP archives and manage packaging through a clear configuration file.',
      ),
      colors: ['#0f172a', '#0ea5e9', '#8b5cf6'],
      status: ['released', 'maintained', 'open-source'],
      progress: 100,
      technologies: ['TypeScript', 'Node.js', 'npm', 'CLI', 'ZIP'],
      highlights: [
        text(
          'Собирает проекты в ZIP-архивы по настраиваемым правилам',
          'Packages projects into ZIP archives with configurable rules',
        ),
        text(
          'Хранит параметры упаковки рядом с исходным кодом проекта',
          'Keeps packaging settings alongside project source code',
        ),
        text(
          'Подходит для повторяемой подготовки и передачи проектов',
          'Makes project preparation and handoff repeatable',
        ),
      ],
      links: [
        {
          url: 'https://github.com/streetraceing/package',
          icon: FaGithub,
          label: text('GitHub', 'GitHub'),
        },
        {
          url: 'https://www.npmjs.com/package/@streetraceing/package',
          icon: Package,
          label: text('npm', 'npm'),
        },
      ],
      relatedLinks: [],
      documentationUrl:
        'https://raw.githubusercontent.com/streetraceing/package/refs/heads/main/docs/README.md',
    },
    {
      slug: 'galactrix',
      name: 'Galactrix',
      icon: Bot,
      shortDescription: text(
        'Локальный мультиплатформенный клиент для общения с нейросетями, roleplay и работы с разными AI-сервисами.',
        'A local cross-platform client for AI conversations, roleplay, and multiple AI services.',
      ),
      longDescription: text(
        'Galactrix - open-source лаунчер и клиент, объединяющий общение с нейросетями, roleplay-сценарии и подключение к популярным AI-провайдерам в одном локальном приложении. Проект поддерживает или планирует интеграции с Ollama, Mistral, Character.AI, Cerebras, Cloudflare Workers и NVIDIA NIM, а в будущем список сервисов будет расширяться. Приложение планируется для Windows и Android. Текущая готовность проекта - около 40%.',
        'Galactrix is an open-source launcher and client that combines AI conversations, roleplay scenarios, and integrations with popular AI providers in one local application. The project supports or plans integrations with Ollama, Mistral, Character.AI, Cerebras, Cloudflare Workers, and NVIDIA NIM, with more services planned in the future. The application is planned for Windows and Android. The project is currently around 40% complete.',
      ),
      colors: ['#111827', '#2563eb', '#7c3aed'],
      status: ['in-development', 'maintained', 'open-source'],
      progress: 40,
      technologies: ['Tauri', 'Rust', 'React', 'TypeScript', 'Vite', 'AI'],
      highlights: [
        text(
          'Единый локальный интерфейс для общения с разными нейросетями',
          'A unified local interface for conversations with different AI models',
        ),
        text(
          'Поддержка обычных диалогов, roleplay-сценариев и разных персонажей',
          'Support for regular conversations, roleplay scenarios, and different characters',
        ),
        text(
          'Интеграции с Ollama, Mistral, Character.AI, Cerebras, Cloudflare Workers и NVIDIA NIM',
          'Integrations with Ollama, Mistral, Character.AI, Cerebras, Cloudflare Workers, and NVIDIA NIM',
        ),
        text(
          'Планируемые версии для Windows и Android',
          'Planned releases for Windows and Android',
        ),
      ],
      links: [
        {
          url: 'https://github.com/streetraceing/galactrix',
          icon: FaGithub,
          label: text('GitHub', 'GitHub'),
        },
      ],
      relatedLinks: [],
    },
    {
      slug: 'streetraceing-site',
      name: 'streetraceing-site',
      icon: Code2,
      shortDescription: text(
        'Мой личный open-source веб-сайт с портфолио, проектами, инструментами и заметками о разработке.',
        'My personal open-source website with a portfolio, projects, tools, and development notes.',
      ),
      longDescription: text(
        'streetraceing-site - мой личный open-source веб-сайт, объединяющий биографию, навыки, статистику разработки, портфолио проектов, инструменты и новости. Сайт поддерживает русский и английский языки, светлую и тёмную темы, отдельные страницы проектов с Markdown-документацией и изображениями, а также авторский режим для управления публикациями и материалами проектов.',
        'streetraceing-site is my personal open-source website combining my biography, skills, development statistics, project portfolio, tools, and news. The website supports Russian and English, light and dark themes, dedicated project pages with Markdown documentation and images, and an author mode for managing posts and project content.',
      ),
      colors: ['#020617', '#2563eb', '#06b6d4'],
      status: ['released', 'maintained', 'open-source'],
      progress: 100,
      technologies: [
        'Next.js',
        'React',
        'TypeScript',
        'Tailwind CSS',
        'HeroUI',
        'PostgreSQL',
        'Drizzle ORM',
      ],
      highlights: [
        text(
          'Адаптивное портфолио с отдельными страницами и документацией проектов',
          'A responsive portfolio with dedicated project pages and documentation',
        ),
        text(
          'Новости, Markdown-редактор и управление материалами через авторский режим',
          'News, a Markdown editor, and content management through author mode',
        ),
        text(
          'Встроенные инструменты для разработчиков и сервис коротких ссылок',
          'Built-in developer tools and a short-link service',
        ),
        text(
          'Локализация, SEO, светлая и тёмная темы',
          'Localization, SEO, and light and dark themes',
        ),
      ],
      links: [
        {
          url: 'https://github.com/streetraceing/streetraceing-site',
          icon: FaGithub,
          label: text('GitHub', 'GitHub'),
        },
      ],
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
      component: 'json-viewer',
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
      component: 'uuid-generator',
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
      component: 'text-tools',
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
      component: 'base64',
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
    {
      slug: 'password-generator',
      component: 'password-generator',
      name: text('Генератор паролей', 'Password Generator'),
      description: text(
        'Криптографически стойкие пароли с настройкой длины и набора символов.',
        'Cryptographically secure passwords with configurable length and character sets.',
      ),
      icon: KeyRound,
      status: 'available',
      tags: [
        text('Безопасность', 'Security'),
        text('Пароли', 'Passwords'),
        text('Клиент', 'Client'),
      ],
    },
    {
      slug: 'jwt-inspector',
      component: 'jwt-inspector',
      name: text('JWT Inspector', 'JWT Inspector'),
      description: text(
        'Локально декодирует header и payload JWT, показывает сроки действия и служебные claims.',
        'Locally decodes JWT headers and payloads and shows timing claims.',
      ),
      icon: ShieldCheck,
      status: 'available',
      tags: [
        text('JWT', 'JWT'),
        text('Безопасность', 'Security'),
        text('API', 'API'),
      ],
    },
    {
      slug: 'hash-generator',
      component: 'hash-generator',
      name: text('Генератор хешей', 'Hash Generator'),
      description: text(
        'SHA-256, SHA-384 и SHA-512 для текста или локального файла без загрузки на сервер.',
        'SHA-256, SHA-384, and SHA-512 for text or local files without uploads.',
      ),
      icon: Fingerprint,
      status: 'available',
      tags: [
        text('Хеши', 'Hashes'),
        text('Файлы', 'Files'),
        text('Безопасность', 'Security'),
      ],
    },
    {
      slug: 'regex-tester',
      component: 'regex-tester',
      name: text('Тестер RegExp', 'RegExp Tester'),
      description: text(
        'Проверяет регулярные выражения, позиции совпадений и группы захвата прямо в браузере.',
        'Tests regular expressions, match positions, and capture groups in the browser.',
      ),
      icon: Regex,
      status: 'available',
      tags: [
        text('RegExp', 'RegExp'),
        text('Текст', 'Text'),
        text('Разработка', 'Dev'),
      ],
    },
    {
      slug: 'url-inspector',
      component: 'url-inspector',
      name: text('URL Inspector', 'URL Inspector'),
      description: text(
        'Разбирает URL по частям и удаляет распространённые рекламные и аналитические параметры.',
        'Breaks URLs into parts and removes common advertising and analytics parameters.',
      ),
      icon: Link2,
      status: 'available',
      tags: [
        text('URL', 'URL'),
        text('Приватность', 'Privacy'),
        text('Разработка', 'Dev'),
      ],
    },
    {
      slug: 'timestamp-converter',
      component: 'timestamp-converter',
      name: text('Конвертер времени', 'Timestamp Converter'),
      description: text(
        'Преобразует Unix timestamp, ISO и обычные даты в несколько удобных форматов.',
        'Converts Unix timestamps, ISO values, and common dates into useful formats.',
      ),
      icon: Clock3,
      status: 'available',
      tags: [
        text('Дата', 'Date'),
        text('Unix', 'Unix'),
        text('Разработка', 'Dev'),
      ],
    },
    {
      slug: 'json-to-typescript',
      component: 'json-to-typescript',
      name: text('JSON в TypeScript', 'JSON to TypeScript'),
      description: text(
        'Строит читаемые TypeScript-интерфейсы по примеру JSON с вложенными объектами и массивами.',
        'Builds readable TypeScript interfaces from JSON with nested objects and arrays.',
      ),
      icon: FileCode2,
      status: 'available',
      tags: [
        text('TypeScript', 'TypeScript'),
        text('JSON', 'JSON'),
        text('Типы', 'Types'),
      ],
    },
    {
      slug: 'text-diff',
      component: 'text-diff',
      name: text('Сравнение текста', 'Text Diff'),
      description: text(
        'Построчно сравнивает две версии текста и показывает добавления и удаления.',
        'Compares two text versions line by line and shows additions and removals.',
      ),
      icon: GitCompareArrows,
      status: 'available',
      tags: [
        text('Diff', 'Diff'),
        text('Текст', 'Text'),
        text('Разработка', 'Dev'),
      ],
    },
    {
      slug: 'color-contrast',
      component: 'color-contrast',
      name: text('Контраст цветов', 'Color Contrast'),
      description: text(
        'Проверяет контраст двух HEX-цветов и соответствие уровням WCAG AA и AAA.',
        'Checks two HEX colors against WCAG AA and AAA contrast levels.',
      ),
      icon: Palette,
      status: 'available',
      tags: [
        text('Цвет', 'Color'),
        text('Доступность', 'Accessibility'),
        text('Дизайн', 'Design'),
      ],
    },
    {
      slug: 'cron-builder',
      component: 'cron-builder',
      name: text('Конструктор Cron', 'Cron Builder'),
      description: text(
        'Собирает распространённые пятичастные cron-выражения из понятного расписания.',
        'Builds common five-field cron expressions from a readable schedule.',
      ),
      icon: CalendarClock,
      status: 'available',
      tags: [
        text('Cron', 'Cron'),
        text('Автоматизация', 'Automation'),
        text('Разработка', 'Dev'),
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
      href: '/tools',
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

import {
  ExternalLink,
  FolderOpen,
  Hammer,
  Home,
  LucideIcon,
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

export type MainPageConfig = {
  projects: {
    name: string;
    size: Size;
    description: string;
    colors: string[];
    links: {
      github?: string;
    };
  }[];
  tools: {
    size: Size;
    icon?: LucideIcon;
    name: string;
    description: string;
    url: string;
  }[];
};

export const mainPageConfig: MainPageConfig = {
  projects: [
    {
      name: 'Luminous',
      description:
        'Красивая тема для Spotify (используя spicetify) с динамическим фоном, который устанавливается отталкиваясь от текущей песни',
      size: 'lg',
      colors: ['#040503', '#767a7b', '#684f36'],
      links: {
        github: 'https://github.com/streetraceing/luminous',
      },
    },
  ],
  tools: [
    {
      name: 'Tiny url',
      description:
        'Сокращатель ссылок и не только, через этот домен этого сайта',
      url: '/tiny-url',
      size: 'lg',
      icon: ExternalLink,
    },
  ],
};

// header config

export type HeaderConfig = {
  links: {
    icon: LucideIcon;
    label: string;
    href?: string;
  }[];
};

export const headerConfig: HeaderConfig = {
  links: [
    {
      icon: Home,
      label: 'Домой',
      href: '/',
    },
    {
      icon: FolderOpen,
      label: 'Проекты',
      href: '/#project-section',
    },
    {
      icon: Hammer,
      label: 'Инструменты',
      href: '/#tool-section',
    },
  ],
};

// footer config

export type FooterConfig = {
  links: {
    label: string;
    href?: string;
    icon?: IconType;
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

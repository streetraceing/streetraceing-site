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

export type AnyIcon = LucideIcon | IconType;

export type MainPageConfig = {
  projects: {
    name: string;
    size: Size;
    shortDescription: string;
    longDescription: string;
    colors: string[];

    links: {
      url: string;
      icon: AnyIcon;
      label: string;
    }[];

    relatedLinks: {
      url: string;
      icon: AnyIcon;
      label: string;
    }[];

    icon?: AnyIcon;
  }[];
  tools: {
    size: Size;
    icon?: AnyIcon;
    name: string;
    description: string;
    url: string;
  }[];
};

export const mainPageConfig: MainPageConfig = {
  projects: [
    {
      name: 'Luminous',
      icon: FaSpotify,
      shortDescription: 'Лёгкая динамическая тема для Spicetify',
      longDescription:
        'Красивая тема для Spotify (используя spicetify) с динамическим фоном, который устанавливается отталкиваясь от текущей песни',
      size: 'lg',
      colors: ['#040503', '#767a7b', '#684f36'],
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
  ],
  tools: [
    {
      name: 'Tiny url',
      description:
        'Сокращатель ссылок и не только, через этот домен этого сайта',
      url: 'tiny-url',
      size: 'lg',
      icon: ExternalLink,
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

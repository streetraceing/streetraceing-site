import { text } from '@/utils/i18n';

export const siteConfig = {
  name: 'streetraceing',
  description: text(
    'Личный сайт full-stack разработчика streetraceing: проекты, open-source, заметки о разработке и браузерные инструменты.',
    'The personal site of full-stack developer streetraceing: projects, open source, development notes, and browser tools.',
  ),
} as const;

import { getText, text, type Locale } from '@/utils/i18n';

export const developmentDirections = [
  {
    id: 'typescript',
    label: text('TypeScript', 'TypeScript'),
    value: 50,
    color: 'accent',
  },
  { id: 'ai', label: text('AI', 'AI'), value: 20, color: 'success' },
  { id: 'rust', label: text('Rust', 'Rust'), value: 20, color: 'warning' },
  { id: 'java', label: text('Java', 'Java'), value: 5, color: 'danger' },
  { id: 'other', label: text('Другое', 'Other'), value: 5, color: 'default' },
] as const;

export const devUpdateTopics = [
  { value: 'projects', label: text('Проекты', 'Projects') },
  { value: 'ai', label: text('AI', 'AI') },
  { value: 'learning', label: text('Обучение', 'Learning') },
  { value: 'site', label: text('Сайт', 'Site') },
  { value: 'other', label: text('Другое', 'Other') },
] as const;

export type DevUpdateTopic = (typeof devUpdateTopics)[number]['value'];

export const DEV_UPDATES_PAGE_SIZE = 5;

export function isDevUpdateTopic(value: string): value is DevUpdateTopic {
  return devUpdateTopics.some((topic) => topic.value === value);
}

export function getDevUpdateTopicLabel(topic: DevUpdateTopic, locale: Locale) {
  const label = devUpdateTopics.find((item) => item.value === topic)?.label;

  return label ? getText(label, locale) : topic;
}

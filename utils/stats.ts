export const developmentDirections = [
  { label: 'TypeScript', value: 50, color: 'accent' },
  { label: 'AI', value: 20, color: 'success' },
  { label: 'Rust', value: 20, color: 'warning' },
  { label: 'Java', value: 5, color: 'danger' },
  { label: 'Другое', value: 5, color: 'default' },
] as const;

export const devUpdateTopics = [
  { value: 'projects', label: 'Проекты' },
  { value: 'ai', label: 'AI' },
  { value: 'learning', label: 'Обучение' },
  { value: 'site', label: 'Сайт' },
  { value: 'other', label: 'Другое' },
] as const;

export type DevUpdateTopic = (typeof devUpdateTopics)[number]['value'];

export const DEV_UPDATES_PAGE_SIZE = 5;

export function isDevUpdateTopic(value: string): value is DevUpdateTopic {
  return devUpdateTopics.some((topic) => topic.value === value);
}

export function getDevUpdateTopicLabel(topic: DevUpdateTopic) {
  return devUpdateTopics.find((item) => item.value === topic)?.label ?? topic;
}

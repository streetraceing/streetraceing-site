import type { DevUpdateTopic } from '@/utils/stats';

export type DevUpdate = {
  id: string;
  title: string | null;
  content: string;
  topic: DevUpdateTopic;
  createdAt: string;
};

export type DevUpdateChange = 'delete' | 'update';

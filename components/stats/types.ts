import type { DevUpdateTopic } from '@/utils/stats';

export type DevUpdate = {
  id: string;
  title: string | null;
  content: string;
  topic: DevUpdateTopic;
  imageUrls: string[];
  createdAt: string;
};

export type DevUpdatesFeed = {
  updates: DevUpdate[];
  pagination: {
    page: number;
    total: number;
    totalPages: number;
  };
};

export type DevUpdateChange = 'delete' | 'update';

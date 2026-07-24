import { asc, count, desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { devUpdates } from '@/db/schema';
import type { DevUpdatesFeed } from '@/components/stats/types';
import {
  DEV_UPDATES_PAGE_SIZE,
  type DevUpdateSort,
  type DevUpdateTopic,
} from '@/utils/stats';

type ReadDevUpdatesFeedOptions = {
  page: number;
  topic?: DevUpdateTopic;
  sort: DevUpdateSort;
};

export async function readDevUpdatesFeed({
  page,
  topic,
  sort,
}: ReadDevUpdatesFeedOptions): Promise<DevUpdatesFeed> {
  const where = topic ? eq(devUpdates.topic, topic) : undefined;
  const orderBy =
    sort === 'oldest' ? asc(devUpdates.createdAt) : desc(devUpdates.createdAt);
  const [totalResult, storedUpdates] = await Promise.all([
    db.select({ total: count() }).from(devUpdates).where(where),
    db
      .select()
      .from(devUpdates)
      .where(where)
      .orderBy(orderBy)
      .limit(DEV_UPDATES_PAGE_SIZE)
      .offset((page - 1) * DEV_UPDATES_PAGE_SIZE),
  ]);
  const total = totalResult[0]?.total ?? 0;

  return {
    updates: storedUpdates.map((update) => ({
      ...update,
      createdAt: update.createdAt.toISOString(),
    })),
    pagination: {
      page,
      total,
      totalPages: Math.max(1, Math.ceil(total / DEV_UPDATES_PAGE_SIZE)),
    },
  };
}

export function getEmptyDevUpdatesFeed(): DevUpdatesFeed {
  return {
    updates: [],
    pagination: {
      page: 1,
      total: 0,
      totalPages: 1,
    },
  };
}

import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import type { DevUpdateTopic } from '@/utils/stats';

export const shortUrls = pgTable(
  'short_urls',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 12 }).notNull(),
    content: text('destination_url').notNull(),
    ownerToken: varchar('owner_token', { length: 64 }).notNull().default(''),
    visitCount: integer('visit_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('short_urls_code_unique').on(table.code),
    index('short_urls_owner_created_at_idx').on(
      table.ownerToken,
      table.createdAt,
    ),
    index('short_urls_created_at_idx').on(table.createdAt),
  ],
);

export const devUpdates = pgTable(
  'dev_updates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 160 }),
    content: text('content').notNull(),
    topic: varchar('topic', { length: 32 }).$type<DevUpdateTopic>().notNull(),
    imageUrls: text('image_urls')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('dev_updates_topic_created_at_idx').on(table.topic, table.createdAt),
    index('dev_updates_created_at_idx').on(table.createdAt),
  ],
);

export const projectContents = pgTable('project_contents', {
  projectSlug: varchar('project_slug', { length: 64 }).primaryKey(),
  imageUrls: text('image_urls')
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const pendingMediaUploads = pgTable(
  'pending_media_uploads',
  {
    publicId: varchar('public_id', { length: 255 }).primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('pending_media_uploads_created_at_idx').on(table.createdAt),
  ],
);

export const rateLimitWindows = pgTable(
  'rate_limit_windows',
  {
    key: varchar('key', { length: 191 }).primaryKey(),
    count: integer('count').notNull().default(0),
    resetAt: timestamp('reset_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('rate_limit_windows_reset_at_idx').on(table.resetAt)],
);

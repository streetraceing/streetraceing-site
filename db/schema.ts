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
    index('short_urls_owner_token_idx').on(table.ownerToken),
  ],
);

export const devUpdates = pgTable(
  'dev_updates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 160 }),
    content: text('content').notNull(),
    topic: varchar('topic', { length: 32 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('dev_updates_topic_created_at_idx').on(table.topic, table.createdAt),
  ],
);

import {
  integer,
  pgTable,
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
    destinationUrl: varchar('destination_url', { length: 2048 }).notNull(),
    visitCount: integer('visit_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('short_urls_code_unique').on(table.code)],
);

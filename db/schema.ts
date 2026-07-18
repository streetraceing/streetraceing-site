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

DROP INDEX IF EXISTS "short_urls_owner_token_idx";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "short_urls_owner_created_at_idx" ON "short_urls" USING btree ("owner_token", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "short_urls_created_at_idx" ON "short_urls" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dev_updates_created_at_idx" ON "dev_updates" USING btree ("created_at");

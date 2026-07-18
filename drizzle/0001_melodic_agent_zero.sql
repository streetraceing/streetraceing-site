ALTER TABLE "short_urls" ALTER COLUMN "destination_url" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "short_urls" ADD COLUMN "owner_token" varchar(64) DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX "short_urls_owner_token_idx" ON "short_urls" USING btree ("owner_token");
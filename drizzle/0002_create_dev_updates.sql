CREATE TABLE "dev_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(160),
	"content" text NOT NULL,
	"topic" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "dev_updates_topic_created_at_idx" ON "dev_updates" USING btree ("topic","created_at");
ALTER TABLE "dev_updates" ADD COLUMN "image_urls" text[] DEFAULT ARRAY[]::text[] NOT NULL;
--> statement-breakpoint
CREATE TABLE "project_contents" (
  "project_slug" varchar(64) PRIMARY KEY NOT NULL,
  "documentation_ru" text DEFAULT '' NOT NULL,
  "documentation_en" text DEFAULT '' NOT NULL,
  "image_urls" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

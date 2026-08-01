DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "project_contents"
    WHERE "documentation_ru" <> '' OR "documentation_en" <> ''
  ) THEN
    RAISE EXCEPTION 'Legacy project documentation is not empty; archive or migrate it before applying 0005.';
  END IF;
END
$$;
--> statement-breakpoint
CREATE TABLE "pending_media_uploads" (
  "public_id" varchar(255) PRIMARY KEY NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "pending_media_uploads_created_at_idx" ON "pending_media_uploads" USING btree ("created_at");
--> statement-breakpoint
CREATE TABLE "rate_limit_windows" (
  "key" varchar(191) PRIMARY KEY NOT NULL,
  "count" integer DEFAULT 0 NOT NULL,
  "reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "rate_limit_windows_reset_at_idx" ON "rate_limit_windows" USING btree ("reset_at");
--> statement-breakpoint
ALTER TABLE "project_contents" DROP COLUMN "documentation_ru";
--> statement-breakpoint
ALTER TABLE "project_contents" DROP COLUMN "documentation_en";

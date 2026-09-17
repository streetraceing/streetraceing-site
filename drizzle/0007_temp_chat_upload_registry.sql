-- Independent inventory deliberately has no room/message foreign keys.
-- Legacy message attachments are imported transactionally before deletion.
CREATE TABLE "temp_chat_uploads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chat_id" uuid NOT NULL,
  "member_id" varchar(32) NOT NULL,
  "provider" varchar(16) NOT NULL,
  "path" varchar(255) NOT NULL,
  "name" varchar(200) NOT NULL,
  "type" varchar(128) NOT NULL,
  "size" integer NOT NULL,
  "message_id" uuid,
  "status" varchar(16) DEFAULT 'pending' NOT NULL,
  "cleanup_after" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "temp_chat_uploads_provider_path_unique" ON "temp_chat_uploads" USING btree ("provider", "path");
--> statement-breakpoint
CREATE INDEX "temp_chat_uploads_cleanup_idx" ON "temp_chat_uploads" USING btree ("status", "cleanup_after", "id");
--> statement-breakpoint
CREATE INDEX "temp_chat_uploads_chat_idx" ON "temp_chat_uploads" USING btree ("chat_id");

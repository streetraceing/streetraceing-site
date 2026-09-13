DROP TABLE IF EXISTS "temp_chat_messages";
--> statement-breakpoint
DROP TABLE IF EXISTS "temp_chats";
--> statement-breakpoint
CREATE TABLE "temp_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"member_id" varchar(32) NOT NULL,
	"author_name" varchar(40) NOT NULL,
	"content" text,
	"file_provider" varchar(16),
	"file_path" varchar(255),
	"file_url" text,
	"file_resource_type" varchar(16),
	"file_name" text,
	"file_type" varchar(128),
	"file_size" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "temp_chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(12) NOT NULL,
	"title" varchar(80) NOT NULL,
	"password_hash" text,
	"ttl_hours" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"owner_token" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "temp_chat_messages" ADD CONSTRAINT "temp_chat_messages_chat_id_temp_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."temp_chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "temp_chat_messages_chat_created_at_idx" ON "temp_chat_messages" USING btree ("chat_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "temp_chats_code_unique" ON "temp_chats" USING btree ("code");--> statement-breakpoint
CREATE INDEX "temp_chats_expires_at_idx" ON "temp_chats" USING btree ("expires_at");
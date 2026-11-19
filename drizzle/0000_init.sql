CREATE TYPE "public"."event_type" AS ENUM('post_created', 'generation_started', 'generation_completed', 'generation_failed', 'draft_copied');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('linkedin', 'x', 'bluesky');--> statement-breakpoint
CREATE TABLE "allowed_emails" (
	"email" text PRIMARY KEY NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"content" text[] NOT NULL,
	"generated_content" text[] NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"model" text NOT NULL,
	CONSTRAINT "drafts_post_platform_unique" UNIQUE("post_id","platform")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"post_id" uuid NOT NULL,
	"platform" "platform",
	"type" "event_type" NOT NULL,
	"model" text,
	"tweet_index" integer,
	"generated_text" text,
	"final_text" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"idea" text DEFAULT '' NOT NULL,
	"idea_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_user_type_created_idx" ON "events" USING btree ("user_id","type","created_at");--> statement-breakpoint
CREATE INDEX "events_post_type_idx" ON "events" USING btree ("post_id","type");--> statement-breakpoint
CREATE INDEX "posts_user_updated_idx" ON "posts" USING btree ("user_id","updated_at");
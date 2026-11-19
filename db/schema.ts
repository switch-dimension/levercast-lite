// Drizzle table definitions. Add tables here, then run `npm run db:generate`
// and `npm run db:migrate` to apply them to the database.
//
// `user_id` columns hold the Neon Auth user ID as plain text with no foreign
// key into `neon_auth.user`, so migrations stay in the `public` schema and
// tests can use made-up user IDs.
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const platformEnum = pgEnum("platform", ["linkedin", "x", "bluesky"]);

export const eventTypeEnum = pgEnum("event_type", [
  "post_created",
  "generation_started",
  "generation_completed",
  "generation_failed",
  "draft_copied",
]);

/** Invite list. Emails are stored trimmed and lowercase. */
export const allowedEmails = pgTable("allowed_emails", {
  email: text("email").primaryKey(),
  note: text("note"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    idea: text("idea").notNull().default(""),
    ideaUpdatedAt: timestamptz("idea_updated_at").notNull().defaultNow(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
    /** Soft delete: set when the user deletes the post. */
    deletedAt: timestamptz("deleted_at"),
  },
  (t) => [index("posts_user_updated_idx").on(t.userId, t.updatedAt)],
);

/**
 * One draft per post per platform. `content` and `generatedContent` hold one
 * element for LinkedIn and Bluesky, and one element per tweet for X.
 */
export const drafts = pgTable(
  "drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id),
    platform: platformEnum("platform").notNull(),
    content: text("content").array().notNull(),
    generatedContent: text("generated_content").array().notNull(),
    generatedAt: timestamptz("generated_at").notNull().defaultNow(),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
    model: text("model").notNull(),
  },
  (t) => [unique("drafts_post_platform_unique").on(t.postId, t.platform)],
);

/** Append-only activity log. Never hard-delete events. */
export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id),
    platform: platformEnum("platform"),
    type: eventTypeEnum("type").notNull(),
    model: text("model"),
    /** Set for a single-tweet X copy. */
    tweetIndex: integer("tweet_index"),
    generatedText: text("generated_text"),
    finalText: text("final_text"),
    error: text("error"),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("events_user_type_created_idx").on(t.userId, t.type, t.createdAt),
    index("events_post_type_idx").on(t.postId, t.type),
  ],
);

export type Platform = (typeof platformEnum.enumValues)[number];
export type EventType = (typeof eventTypeEnum.enumValues)[number];
export type Post = typeof posts.$inferSelect;
export type Draft = typeof drafts.$inferSelect;
export type Event = typeof events.$inferSelect;

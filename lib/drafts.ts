// Draft queries. One draft per post per platform; content and
// generated_content are text[] (one element per tweet for X).
import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { drafts, posts, type Draft, type Platform } from "@/db/schema";
import { insertEvent } from "@/lib/events";
import { isUuid, owned } from "@/lib/posts";

/** The post's drafts, or [] if the post isn't the user's. */
export async function getDrafts(userId: string, postId: string): Promise<Draft[]> {
  const rows = await db
    .select({ draft: drafts })
    .from(drafts)
    .innerJoin(posts, eq(posts.id, drafts.postId))
    .where(and(eq(drafts.postId, postId), eq(posts.userId, userId)));
  return rows.map((r) => r.draft);
}

/**
 * Saves the user's edit to a draft (FR-18). Only `content` changes; the
 * generated text stays for *edited* checks and copy events. Returns null if
 * the post isn't the user's, is deleted, or has no draft for the platform.
 */
export async function updateDraftContent(
  userId: string,
  postId: string,
  platform: Platform,
  content: string[],
): Promise<Draft | null> {
  if (!isUuid(postId)) return null;
  const ownedPost = db.select({ id: posts.id }).from(posts).where(owned(userId, postId));
  const [updated] = await db.batch([
    db
      .update(drafts)
      .set({ content, updatedAt: sql`now()` })
      .where(and(eq(drafts.postId, postId), eq(drafts.platform, platform), inArray(drafts.postId, ownedPost)))
      .returning(),
    db.update(posts).set({ updatedAt: sql`now()` }).where(owned(userId, postId)),
  ]);
  return updated[0] ?? null;
}

/**
 * Saves a freshly generated draft (replacing any previous one) and records
 * *generation completed*, together.
 *
 * A draft is stale when generated_at < posts.idea_updated_at (FR-20). If the
 * idea was edited while this draft was being written, generated_at is set to
 * the time of the idea it was written from, so it shows as stale at once.
 */
export async function saveGeneratedDraft(args: {
  userId: string;
  postId: string;
  platform: Platform;
  content: string[];
  model: string;
  /** idea_updated_at of the idea the draft was written from. */
  ideaUpdatedAt?: Date;
}): Promise<Draft> {
  const { userId, postId, platform, content, model, ideaUpdatedAt } = args;
  const generatedAt = ideaUpdatedAt
    ? // JS dates carry milliseconds; Postgres keeps microseconds.
      sql`case when (select date_trunc('milliseconds', ${posts.ideaUpdatedAt}) from ${posts} where ${posts.id} = ${postId}) > ${ideaUpdatedAt.toISOString()}::timestamptz
        then ${ideaUpdatedAt.toISOString()}::timestamptz else now() end`
    : sql`now()`;
  const [[draft]] = await db.batch([
    db
      .insert(drafts)
      .values({ postId, platform, content, generatedContent: content, model, generatedAt })
      .onConflictDoUpdate({
        target: [drafts.postId, drafts.platform],
        set: {
          content,
          generatedContent: content,
          model,
          generatedAt,
          updatedAt: sql`now()`,
        },
      })
      .returning(),
    insertEvent({ userId, postId, platform, type: "generation_completed", model }),
  ]);
  return draft;
}

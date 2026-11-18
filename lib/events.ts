// The append-only event log (FR-21). Events are never shown in the UI and
// never hard-deleted.
import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { drafts, events, posts, type Platform } from "@/db/schema";
import { joinThread } from "@/lib/domain/thread";
import { isUuid, owned } from "@/lib/posts";

/** When the user started generations since `since` (for the rate limit). */
export async function generationStartsSince(userId: string, since: Date): Promise<Date[]> {
  const rows = await db
    .select({ at: events.createdAt })
    .from(events)
    .where(and(eq(events.userId, userId), eq(events.type, "generation_started"), gt(events.createdAt, since)));
  return rows.map((r) => r.at);
}

export type NewEvent = typeof events.$inferInsert;

/** An insert query, for use alone or inside db.batch([...]). */
export function insertEvent(event: NewEvent) {
  return db.insert(events).values(event);
}

export async function recordEvent(event: NewEvent): Promise<void> {
  await insertEvent(event);
}

type CopyArgs = {
  userId: string;
  postId: string;
  platform: Platform;
  /** The draft as it was copied; saved too, since copying also saves (FR-18). */
  content: string[];
  /** 1-based tweet number for a single-tweet copy (stored in tweet_index). */
  tweet?: number;
};

/**
 * Records *draft copied* with the generated and final text (FR-22) and saves
 * the copied content, together. Returns false, recording nothing, if the post
 * isn't the user's, has no such draft, or has no such tweet.
 */
export async function recordDraftCopied({ userId, postId, platform, content, tweet }: CopyArgs): Promise<boolean> {
  if (!isUuid(postId)) return false;
  const [draft] = await db
    .select({ generatedContent: drafts.generatedContent, model: drafts.model })
    .from(drafts)
    .innerJoin(posts, eq(posts.id, drafts.postId))
    .where(and(eq(drafts.postId, postId), eq(drafts.platform, platform), owned(userId, postId)));
  if (!draft) return false;

  let generatedText: string | null;
  let finalText: string;
  if (tweet === undefined) {
    generatedText = joinThread(draft.generatedContent);
    finalText = joinThread(content);
  } else {
    if (!Number.isInteger(tweet) || tweet < 1 || tweet > content.length) return false;
    generatedText = draft.generatedContent[tweet - 1] ?? null;
    finalText = content[tweet - 1];
  }

  await db.batch([
    db
      .update(drafts)
      .set({ content, updatedAt: sql`now()` })
      .where(and(eq(drafts.postId, postId), eq(drafts.platform, platform))),
    insertEvent({
      userId,
      postId,
      platform,
      type: "draft_copied",
      model: draft.model,
      tweetIndex: tweet ?? null,
      generatedText,
      finalText,
    }),
  ]);
  return true;
}

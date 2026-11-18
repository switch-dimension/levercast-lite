// Draft queries. One draft per post per platform; content and
// generated_content are text[] (one element per tweet for X).
import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { drafts, posts, type Draft, type Platform } from "@/db/schema";
import { insertEvent } from "@/lib/events";

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
 * Saves a freshly generated draft (replacing any previous one) and records
 * *generation completed*, together.
 */
export async function saveGeneratedDraft(args: {
  userId: string;
  postId: string;
  platform: Platform;
  content: string[];
  model: string;
}): Promise<Draft> {
  const { userId, postId, platform, content, model } = args;
  const [[draft]] = await db.batch([
    db
      .insert(drafts)
      .values({ postId, platform, content, generatedContent: content, model })
      .onConflictDoUpdate({
        target: [drafts.postId, drafts.platform],
        set: {
          content,
          generatedContent: content,
          model,
          generatedAt: sql`now()`,
          updatedAt: sql`now()`,
        },
      })
      .returning(),
    insertEvent({ userId, postId, platform, type: "generation_completed", model }),
  ]);
  return draft;
}

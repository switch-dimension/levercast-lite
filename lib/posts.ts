// Post queries. Every function takes the owner's userId and scopes to it, so
// another user's post looks exactly like a missing one (AC-6). Soft-deleted
// posts are invisible here too (FR-9).
import "server-only";
import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { posts, type Post } from "@/db/schema";
import { IDEA_SAVE_MAX } from "@/lib/domain/idea";
import { insertEvent } from "@/lib/events";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (id: string) => UUID.test(id);

const owned = (userId: string, postId: string) =>
  and(eq(posts.id, postId), eq(posts.userId, userId), isNull(posts.deletedAt));

const clean = (idea: string) => idea.trim().slice(0, IDEA_SAVE_MAX);

/** Creates a post and its single *post created* event together. */
export async function createPost(userId: string, idea: string): Promise<Post> {
  const text = clean(idea);
  if (!text) throw new Error("Can't create a post from an empty idea");
  const id = randomUUID();
  const [[post]] = await db.batch([
    db.insert(posts).values({ id, userId, idea: text }).returning(),
    insertEvent({ userId, postId: id, type: "post_created" }),
  ]);
  return post;
}

/**
 * Saves a new idea text. idea_updated_at moves only when the text really
 * changes, so an unchanged save never marks drafts as stale.
 */
export async function updateIdea(userId: string, postId: string, idea: string): Promise<Post | null> {
  if (!isUuid(postId)) return null;
  const text = clean(idea);
  const [changed] = await db
    .update(posts)
    .set({ idea: text, ideaUpdatedAt: sql`now()`, updatedAt: sql`now()` })
    .where(and(owned(userId, postId), ne(posts.idea, text)))
    .returning();
  return changed ?? getPost(userId, postId);
}

export async function getPost(userId: string, postId: string): Promise<Post | null> {
  if (!isUuid(postId)) return null;
  const [post] = await db.select().from(posts).where(owned(userId, postId)).limit(1);
  return post ?? null;
}

export type PostListItem = Pick<Post, "id" | "idea" | "updatedAt"> & { hasDrafts: boolean; copied: boolean };

/** The user's posts, newest-updated first, with what's needed for status (FR-5). */
export async function listPosts(userId: string, { limit }: { limit?: number } = {}): Promise<PostListItem[]> {
  const query = db
    .select({
      id: posts.id,
      idea: posts.idea,
      updatedAt: posts.updatedAt,
      // Qualified by hand: drizzle renders ${posts.id} as a bare "id" in a
      // single-table select, which would bind to the subquery's own id.
      hasDrafts: sql<boolean>`exists (select 1 from drafts d where d.post_id = "posts"."id")`,
      copied: sql<boolean>`exists (select 1 from events e where e.post_id = "posts"."id" and e.type = 'draft_copied')`,
    })
    .from(posts)
    .where(and(eq(posts.userId, userId), isNull(posts.deletedAt)))
    .orderBy(desc(posts.updatedAt))
    .$dynamic();
  return limit ? query.limit(limit) : query;
}

/** Soft delete. Returns false if the post wasn't the user's or was already gone. */
export async function softDeletePost(userId: string, postId: string): Promise<boolean> {
  if (!isUuid(postId)) return false;
  const deleted = await db
    .update(posts)
    .set({ deletedAt: sql`now()` })
    .where(owned(userId, postId))
    .returning({ id: posts.id });
  return deleted.length > 0;
}

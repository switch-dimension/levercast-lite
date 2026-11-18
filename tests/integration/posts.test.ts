import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { drafts, events, posts } from "@/db/schema";
import { createPost, getPost, listPosts, softDeletePost, updateIdea } from "@/lib/posts";

const userA = `test-user-${randomUUID()}`;
const userB = `test-user-${randomUUID()}`;

afterAll(async () => {
  const owned = await db
    .select({ id: posts.id })
    .from(posts)
    .where(inArray(posts.userId, [userA, userB]));
  const ids = owned.map((p) => p.id);
  if (ids.length) {
    await db.delete(events).where(inArray(events.postId, ids));
    await db.delete(drafts).where(inArray(drafts.postId, ids));
    await db.delete(posts).where(inArray(posts.id, ids));
  }
});

const eventTypes = async (postId: string) =>
  (await db.select({ type: events.type }).from(events).where(eq(events.postId, postId))).map((e) => e.type);

describe("posts", () => {
  it("creates a post with the trimmed idea and exactly one post_created event (AC-8a)", async () => {
    const post = await createPost(userA, "  Clients buy outcomes, not hours.  ");
    expect(post.idea).toBe("Clients buy outcomes, not hours.");
    expect(post.userId).toBe(userA);
    expect(await eventTypes(post.id)).toEqual(["post_created"]);

    const [event] = await db.select().from(events).where(eq(events.postId, post.id));
    expect(event.userId).toBe(userA);
  });

  it("refuses to create a post from an empty idea", async () => {
    await expect(createPost(userA, "   \n ")).rejects.toThrow();
  });

  it("updates the idea and its timestamps without adding events", async () => {
    const post = await createPost(userA, "First take");
    const updated = await updateIdea(userA, post.id, "Second take ");
    expect(updated?.idea).toBe("Second take");
    expect(updated!.ideaUpdatedAt.getTime()).toBeGreaterThan(post.ideaUpdatedAt.getTime());
    expect(updated!.updatedAt.getTime()).toBeGreaterThan(post.updatedAt.getTime());
    expect(await eventTypes(post.id)).toEqual(["post_created"]);
  });

  it("leaves idea_updated_at alone when the text hasn't changed", async () => {
    const post = await createPost(userA, "Same idea");
    const again = await updateIdea(userA, post.id, "  Same idea ");
    expect(again!.ideaUpdatedAt.getTime()).toBe(post.ideaUpdatedAt.getTime());
  });

  it("scopes every query to its owner (AC-6)", async () => {
    const post = await createPost(userA, "A's private idea");

    expect(await getPost(userB, post.id)).toBeNull();
    expect(await updateIdea(userB, post.id, "B was here")).toBeNull();
    expect(await softDeletePost(userB, post.id)).toBe(false);
    expect((await listPosts(userB)).map((p) => p.id)).not.toContain(post.id);

    expect((await getPost(userA, post.id))?.idea).toBe("A's private idea");
  });

  it("returns null for unknown or malformed post IDs", async () => {
    expect(await getPost(userA, randomUUID())).toBeNull();
    expect(await getPost(userA, "not-a-uuid")).toBeNull();
    expect(await updateIdea(userA, "not-a-uuid", "x")).toBeNull();
  });

  it("soft delete hides the post everywhere but keeps its events (AC-10)", async () => {
    const post = await createPost(userA, "Delete me");
    expect(await softDeletePost(userA, post.id)).toBe(true);

    expect(await getPost(userA, post.id)).toBeNull();
    expect(await updateIdea(userA, post.id, "too late")).toBeNull();
    expect((await listPosts(userA)).map((p) => p.id)).not.toContain(post.id);
    expect(await eventTypes(post.id)).toEqual(["post_created"]);

    const [row] = await db.select().from(posts).where(and(eq(posts.id, post.id)));
    expect(row.deletedAt).toBeInstanceOf(Date);
  });

  it("lists a user's posts newest-updated first with draft and copied flags (AC-7)", async () => {
    const user = `test-user-${randomUUID()}`;
    try {
      const first = await createPost(user, "Oldest");
      const second = await createPost(user, "Has drafts");
      const third = await createPost(user, "Copied");
      await updateIdea(user, first.id, "Oldest, but just edited");

      await db.insert(drafts).values([
        { postId: second.id, platform: "linkedin", content: ["d"], generatedContent: ["d"], model: "mock" },
        { postId: third.id, platform: "x", content: ["t"], generatedContent: ["t"], model: "mock" },
      ]);
      await db.insert(events).values({ userId: user, postId: third.id, platform: "x", type: "draft_copied" });

      const list = await listPosts(user);
      expect(list.map((p) => p.idea)).toEqual(["Oldest, but just edited", "Copied", "Has drafts"]);
      expect(list.map((p) => [p.hasDrafts, p.copied])).toEqual([
        [false, false],
        [true, true],
        [true, false],
      ]);
      expect(await listPosts(user, { limit: 2 })).toHaveLength(2);
    } finally {
      const ids = (await db.select({ id: posts.id }).from(posts).where(eq(posts.userId, user))).map((p) => p.id);
      await db.delete(events).where(inArray(events.postId, ids));
      await db.delete(drafts).where(inArray(drafts.postId, ids));
      await db.delete(posts).where(inArray(posts.id, ids));
    }
  });
});

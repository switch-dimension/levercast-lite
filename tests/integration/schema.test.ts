import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { allowedEmails, drafts, events, posts } from "@/db/schema";

const userId = `test-user-${randomUUID()}`;
const email = `schema-${randomUUID()}@example.test`;

afterAll(async () => {
  // Events and drafts reference posts, so delete them first.
  const owned = await db.select({ id: posts.id }).from(posts).where(eq(posts.userId, userId));
  for (const { id } of owned) {
    await db.delete(events).where(eq(events.postId, id));
    await db.delete(drafts).where(eq(drafts.postId, id));
  }
  await db.delete(posts).where(eq(posts.userId, userId));
  await db.delete(allowedEmails).where(eq(allowedEmails.email, email));
});

describe("schema smoke test", () => {
  it("inserts and reads back a post", async () => {
    const [created] = await db
      .insert(posts)
      .values({ userId, idea: "Clients buy outcomes, not hours." })
      .returning();

    const [read] = await db.select().from(posts).where(eq(posts.id, created.id));

    expect(read.userId).toBe(userId);
    expect(read.idea).toBe("Clients buy outcomes, not hours.");
    expect(read.deletedAt).toBeNull();
    expect(read.createdAt).toBeInstanceOf(Date);
    expect(read.ideaUpdatedAt).toBeInstanceOf(Date);
  });

  it("stores X drafts as one array element per tweet and allows one draft per platform", async () => {
    const [post] = await db.insert(posts).values({ userId, idea: "A thread idea" }).returning();
    const tweets = ["First tweet.", "Second tweet.", "Third tweet."];

    await db.insert(drafts).values({
      postId: post.id,
      platform: "x",
      content: tweets,
      generatedContent: tweets,
      model: "mock",
    });

    const [draft] = await db.select().from(drafts).where(eq(drafts.postId, post.id));
    expect(draft.content).toEqual(tweets);

    await expect(
      db.insert(drafts).values({
        postId: post.id,
        platform: "x",
        content: ["dup"],
        generatedContent: ["dup"],
        model: "mock",
      }),
    ).rejects.toThrow();
  });

  it("records events and allowed emails", async () => {
    const [post] = await db.insert(posts).values({ userId, idea: "Event idea" }).returning();

    await db.insert(events).values([
      { userId, postId: post.id, type: "post_created" },
      { userId, postId: post.id, platform: "linkedin", type: "generation_started", model: "mock" },
    ]);
    const rows = await db.select().from(events).where(eq(events.postId, post.id));
    expect(rows.map((r) => r.type).sort()).toEqual(["generation_started", "post_created"]);

    await db.insert(allowedEmails).values({ email, note: "smoke test" });
    const [allowed] = await db.select().from(allowedEmails).where(eq(allowedEmails.email, email));
    expect(allowed.note).toBe("smoke test");
  });
});

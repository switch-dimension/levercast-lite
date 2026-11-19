import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { drafts, events, posts } from "@/db/schema";
import { getDrafts, saveGeneratedDraft } from "@/lib/drafts";
import { recordDraftCopied } from "@/lib/events";
import { createPost, listPosts } from "@/lib/posts";

const userA = `test-user-${randomUUID()}`;
const userB = `test-user-${randomUUID()}`;

afterAll(async () => {
  const ids = (await db.select({ id: posts.id }).from(posts).where(inArray(posts.userId, [userA, userB]))).map(
    (p) => p.id,
  );
  if (ids.length) {
    await db.delete(events).where(inArray(events.postId, ids));
    await db.delete(drafts).where(inArray(drafts.postId, ids));
    await db.delete(posts).where(inArray(posts.id, ids));
  }
});

const THREAD = ["1/ One", "2/ Two", "3/ Three"];

async function postWithDrafts() {
  const post = await createPost(userA, "Clients buy outcomes, not hours.");
  await saveGeneratedDraft({ userId: userA, postId: post.id, platform: "linkedin", content: ["Generated"], model: "m1" });
  await saveGeneratedDraft({ userId: userA, postId: post.id, platform: "x", content: THREAD, model: "m2" });
  return post;
}

const copies = (postId: string) =>
  db
    .select()
    .from(events)
    .where(and(eq(events.postId, postId), eq(events.type, "draft_copied")));

describe("recordDraftCopied (FR-21, FR-22)", () => {
  it("records an unedited copy with the platform, model, and the same generated and final text (AC-22)", async () => {
    const post = await postWithDrafts();
    expect(await recordDraftCopied({ userId: userA, postId: post.id, platform: "linkedin", content: ["Generated"] })).toBe(
      true,
    );

    const [event] = await copies(post.id);
    expect(event).toMatchObject({
      userId: userA,
      platform: "linkedin",
      model: "m1",
      tweetIndex: null,
      generatedText: "Generated",
      finalText: "Generated",
    });
  });

  it("stores the original and the edited text, and saves the edit (AC-25)", async () => {
    const post = await postWithDrafts();
    await recordDraftCopied({ userId: userA, postId: post.id, platform: "linkedin", content: ["My edit"] });

    const [event] = await copies(post.id);
    expect(event).toMatchObject({ generatedText: "Generated", finalText: "My edit" });
    const draft = (await getDrafts(userA, post.id)).find((d) => d.platform === "linkedin")!;
    expect(draft.content).toEqual(["My edit"]);
    expect(draft.generatedContent).toEqual(["Generated"]);
  });

  it("Copy thread stores every tweet joined by blank lines (AC-22)", async () => {
    const post = await postWithDrafts();
    const edited = ["1/ One", "2/ Two, edited", "3/ Three"];
    await recordDraftCopied({ userId: userA, postId: post.id, platform: "x", content: edited });

    const [event] = await copies(post.id);
    expect(event).toMatchObject({
      platform: "x",
      model: "m2",
      tweetIndex: null,
      generatedText: "1/ One\n\n2/ Two\n\n3/ Three",
      finalText: "1/ One\n\n2/ Two, edited\n\n3/ Three",
    });
  });

  it("a single-tweet copy records the tweet number and just that tweet's texts (AC-22a)", async () => {
    const post = await postWithDrafts();
    const edited = ["1/ One", "2/ Two", "3/ Three, edited"];
    await recordDraftCopied({ userId: userA, postId: post.id, platform: "x", content: edited, tweet: 3 });

    const [event] = await copies(post.id);
    expect(event).toMatchObject({ tweetIndex: 3, generatedText: "3/ Three", finalText: "3/ Three, edited" });
  });

  it("marks the post Copied in My posts (AC-7)", async () => {
    const post = await postWithDrafts();
    expect((await listPosts(userA)).find((p) => p.id === post.id)?.copied).toBe(false);
    await recordDraftCopied({ userId: userA, postId: post.id, platform: "linkedin", content: ["Generated"] });
    expect((await listPosts(userA)).find((p) => p.id === post.id)?.copied).toBe(true);
  });

  it("records nothing for another user's post, a missing draft, or a tweet that doesn't exist", async () => {
    const post = await postWithDrafts();
    expect(await recordDraftCopied({ userId: userB, postId: post.id, platform: "linkedin", content: ["x"] })).toBe(false);
    expect(await recordDraftCopied({ userId: userA, postId: post.id, platform: "bluesky", content: ["x"] })).toBe(false);
    expect(
      await recordDraftCopied({ userId: userA, postId: post.id, platform: "x", content: THREAD, tweet: 4 }),
    ).toBe(false);
    expect(await recordDraftCopied({ userId: userA, postId: "nope", platform: "x", content: THREAD })).toBe(false);
    expect(await copies(post.id)).toHaveLength(0);
    expect((await getDrafts(userA, post.id)).find((d) => d.platform === "linkedin")!.content).toEqual(["Generated"]);
  });
});

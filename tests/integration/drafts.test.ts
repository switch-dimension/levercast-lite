import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { drafts, events, posts } from "@/db/schema";
import { getDrafts, saveGeneratedDraft, updateDraftContent } from "@/lib/drafts";
import { createPost, getPost, softDeletePost } from "@/lib/posts";

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

async function postWithDrafts() {
  const post = await createPost(userA, "Clients buy outcomes, not hours.");
  await saveGeneratedDraft({ userId: userA, postId: post.id, platform: "linkedin", content: ["Original"], model: "m" });
  await saveGeneratedDraft({ userId: userA, postId: post.id, platform: "x", content: ["1/ One", "2/ Two"], model: "m" });
  return post;
}

const draftOf = async (postId: string, platform: string) =>
  (await getDrafts(userA, postId)).find((d) => d.platform === platform)!;

describe("updateDraftContent (FR-18, AC-21)", () => {
  it("saves the edit, keeps the generated text, and a reload shows it (AC-11)", async () => {
    const post = await postWithDrafts();
    const saved = await updateDraftContent(userA, post.id, "linkedin", ["Edited"]);
    expect(saved?.content).toEqual(["Edited"]);

    const draft = await draftOf(post.id, "linkedin");
    expect(draft.content).toEqual(["Edited"]);
    expect(draft.generatedContent).toEqual(["Original"]);
    expect(draft.updatedAt.getTime()).toBeGreaterThan(draft.generatedAt.getTime());
  });

  it("edits one tweet of an X thread without touching the others or other platforms", async () => {
    const post = await postWithDrafts();
    await updateDraftContent(userA, post.id, "x", ["1/ One", "2/ Two, edited"]);

    expect((await draftOf(post.id, "x")).content).toEqual(["1/ One", "2/ Two, edited"]);
    expect((await draftOf(post.id, "linkedin")).content).toEqual(["Original"]);
  });

  it("moves the post to the top of My posts", async () => {
    const post = await postWithDrafts();
    const before = (await getPost(userA, post.id))!.updatedAt;
    await updateDraftContent(userA, post.id, "linkedin", ["Edited"]);
    expect((await getPost(userA, post.id))!.updatedAt.getTime()).toBeGreaterThan(before.getTime());
  });

  it("refuses another user's post, a deleted post, a missing draft, and a bad ID (AC-6)", async () => {
    const post = await postWithDrafts();
    expect(await updateDraftContent(userB, post.id, "linkedin", ["Hijack"])).toBeNull();
    expect(await updateDraftContent(userA, post.id, "bluesky", ["No draft yet"])).toBeNull();
    expect(await updateDraftContent(userA, "not-a-uuid", "linkedin", ["x"])).toBeNull();

    const gone = await postWithDrafts();
    await softDeletePost(userA, gone.id);
    expect(await updateDraftContent(userA, gone.id, "linkedin", ["Too late"])).toBeNull();

    const [row] = await db.select().from(drafts).where(eq(drafts.postId, post.id)).limit(1);
    expect(row.content).not.toEqual(["Hijack"]);
  });

  it("records no event for an edit", async () => {
    const post = await postWithDrafts();
    const count = async () => (await db.select().from(events).where(eq(events.postId, post.id))).length;
    const before = await count();
    await updateDraftContent(userA, post.id, "linkedin", ["Edited"]);
    expect(await count()).toBe(before);
  });
});

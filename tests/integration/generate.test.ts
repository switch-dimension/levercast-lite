import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { drafts, events, posts } from "@/db/schema";
import { generateDraft } from "@/lib/ai/generate";
import { readDraftStream } from "@/lib/domain/draft-stream";
import { createPost, updateIdea } from "@/lib/posts";

const users: string[] = [];
const newUser = () => {
  const id = `test-user-${randomUUID()}`;
  users.push(id);
  return id;
};

afterAll(async () => {
  const ids = (await db.select({ id: posts.id }).from(posts).where(inArray(posts.userId, users))).map((p) => p.id);
  if (ids.length) {
    await db.delete(events).where(inArray(events.postId, ids));
    await db.delete(drafts).where(inArray(drafts.postId, ids));
    await db.delete(posts).where(inArray(posts.id, ids));
  }
  await db.delete(events).where(inArray(events.userId, users));
});

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

/** A mock model that streams `chunks`, then optionally an error part. */
function streamingModel(chunks: string[], { errorPart = false } = {}) {
  const model = new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunkDelayInMs: 5,
        chunks: [
          { type: "text-start" as const, id: "t" },
          ...chunks.map((delta) => ({ type: "text-delta" as const, id: "t", delta })),
          ...(errorPart ? [{ type: "error" as const, error: new Error("Gateway hiccup") }] : []),
          { type: "text-end" as const, id: "t" },
          { type: "finish" as const, finishReason: { unified: "stop" as const, raw: undefined }, usage },
        ],
      }),
    }),
  });
  return model;
}

const throwingModel = () =>
  new MockLanguageModelV4({
    doStream: async () => {
      throw new Error("Gateway is down");
    },
  });

const eventsFor = (postId: string) =>
  db.select().from(events).where(eq(events.postId, postId)).orderBy(events.createdAt);

const draftFor = async (postId: string, platform: "linkedin" | "x" | "bluesky") =>
  (await db.select().from(drafts).where(and(eq(drafts.postId, postId), eq(drafts.platform, platform))))[0];

describe("generateDraft", () => {
  it("streams the draft, then saves it and records started + completed (AC-24)", async () => {
    const userId = newUser();
    const post = await createPost(userId, "Clients buy outcomes, not hours.");

    const res = await generateDraft({
      userId,
      post,
      platform: "linkedin",
      model: streamingModel(["Clients buy ", "outcomes, ", "not hours."]),
      modelId: "test-model",
    });
    expect(res.status).toBe(200);
    expect(readDraftStream(await res.text())).toEqual({
      text: "Clients buy outcomes, not hours.",
      result: { ok: true },
    });

    const draft = await draftFor(post.id, "linkedin");
    expect(draft.content).toEqual(["Clients buy outcomes, not hours."]);
    expect(draft.generatedContent).toEqual(draft.content);
    expect(draft.model).toBe("test-model");

    const log = await eventsFor(post.id);
    expect(log.map((e) => e.type)).toEqual(["post_created", "generation_started", "generation_completed"]);
    for (const e of log.slice(1)) {
      expect(e).toMatchObject({ userId, platform: "linkedin", model: "test-model" });
    }
  });

  it("saves an X thread as one element per tweet (AC-14)", async () => {
    const userId = newUser();
    const post = await createPost(userId, "Idea");
    await (
      await generateDraft({ userId, post, platform: "x", model: streamingModel(["1/ One\n\n", "2/ Two\n\n3/ Three"]) })
    ).text();

    const draft = await draftFor(post.id, "x");
    expect(draft.content).toEqual(["1/ One", "2/ Two", "3/ Three"]);
    expect(draft.generatedContent).toEqual(draft.content);
  });

  it("a draft generated from the current idea isn't stale; editing the idea afterwards makes it stale (AC-23)", async () => {
    const userId = newUser();
    const post = await createPost(userId, "Idea");
    await (await generateDraft({ userId, post, platform: "linkedin", model: streamingModel(["Draft"]) })).text();
    const fresh = await draftFor(post.id, "linkedin");
    // Stamped with the generation time, not the idea's.
    expect(fresh.generatedAt.getTime()).toBeGreaterThan(post.ideaUpdatedAt.getTime());

    const edited = (await updateIdea(userId, post.id, "A new idea"))!;
    expect(fresh.generatedAt.getTime()).toBeLessThan(edited.ideaUpdatedAt.getTime());
    expect((await draftFor(post.id, "linkedin")).content).toEqual(["Draft"]);
  });

  it("a draft started before an idea edit finishes against the old idea, then counts as stale (4.4)", async () => {
    const userId = newUser();
    const post = await createPost(userId, "Old idea");
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const inner = streamingModel(["From the old idea"]);
    const gated = new MockLanguageModelV4({
      doStream: async (options) => {
        await gate;
        return inner.doStream(options);
      },
    });

    const res = await generateDraft({ userId, post, platform: "bluesky", model: gated });
    const edited = (await updateIdea(userId, post.id, "New idea"))!;
    release();
    await res.text();

    const draft = await draftFor(post.id, "bluesky");
    expect(draft.content).toEqual(["From the old idea"]);
    expect(draft.generatedAt.getTime()).toBeLessThan(edited.ideaUpdatedAt.getTime());

    // Regenerating against the new idea clears it.
    await (await generateDraft({ userId, post: edited, platform: "bluesky", model: streamingModel(["New"]) })).text();
    expect((await draftFor(post.id, "bluesky")).generatedAt.getTime()).toBeGreaterThanOrEqual(
      edited.ideaUpdatedAt.getTime(),
    );
  });

  it("regenerating replaces the draft and records another started + completed", async () => {
    const userId = newUser();
    const post = await createPost(userId, "Idea");
    await (await generateDraft({ userId, post, platform: "bluesky", model: streamingModel(["One"]) })).text();
    await (await generateDraft({ userId, post, platform: "bluesky", model: streamingModel(["Two"]) })).text();

    expect((await draftFor(post.id, "bluesky")).content).toEqual(["Two"]);
    const types = (await eventsFor(post.id)).map((e) => e.type);
    expect(types.filter((t) => t === "generation_completed")).toHaveLength(2);
  });

  it.each([
    ["the model call throws", () => throwingModel()],
    ["the stream reports an error", () => streamingModel(["Half a dr"], { errorPart: true })],
    ["the output is empty", () => streamingModel(["   "])],
  ])("when %s: reports failure in-band, records failed, and keeps the previous draft (AC-16)", async (_, makeModel) => {
    const userId = newUser();
    const post = await createPost(userId, "Idea");
    await (await generateDraft({ userId, post, platform: "x", model: streamingModel(["1/ Earlier draft"]) })).text();

    const res = await generateDraft({ userId, post, platform: "x", model: makeModel() });
    // The stream closes cleanly (a broken connection makes browsers retry the
    // POST); the failure is in the result.
    expect(res.status).toBe(200);
    expect(readDraftStream(await res.text()).result).toMatchObject({ ok: false });

    expect((await draftFor(post.id, "x")).content).toEqual(["1/ Earlier draft"]);
    const log = await eventsFor(post.id);
    const failed = log.filter((e) => e.type === "generation_failed");
    expect(failed).toHaveLength(1);
    expect(failed[0]).toMatchObject({ userId, platform: "x" });
    expect(failed[0].error).toBeTruthy();
  });

  it("records failed and saves nothing when the client leaves mid-stream (spec edge case)", async () => {
    const userId = newUser();
    const post = await createPost(userId, "Idea");
    const res = await generateDraft({
      userId,
      post,
      platform: "linkedin",
      model: streamingModel(Array.from({ length: 50 }, (_, i) => `word${i} `)),
    });
    const reader = res.body!.getReader();
    await reader.read();
    await reader.cancel();
    await new Promise((r) => setTimeout(r, 300));

    expect(await draftFor(post.id, "linkedin")).toBeUndefined();
    const types = (await eventsFor(post.id)).map((e) => e.type);
    expect(types).toEqual(["post_created", "generation_started", "generation_failed"]);
  });

  it("records failed and saves nothing when the request is aborted mid-stream (5.1)", async () => {
    const userId = newUser();
    const post = await createPost(userId, "Idea");
    const request = new AbortController();
    const res = await generateDraft({
      userId,
      post,
      platform: "bluesky",
      signal: request.signal,
      model: streamingModel(Array.from({ length: 50 }, (_, i) => `word${i} `)),
    });
    const reader = res.body!.getReader();
    await reader.read();
    request.abort();
    while (!(await reader.read()).done);

    expect(await draftFor(post.id, "bluesky")).toBeUndefined();
    const log = await eventsFor(post.id);
    expect(log.map((e) => e.type)).toEqual(["post_created", "generation_started", "generation_failed"]);
    expect(log[2].error).toMatch(/stopped before it finished/);
  });

  it("aborted before the generation starts: records nothing and makes no model call (5.1)", async () => {
    const userId = newUser();
    const post = await createPost(userId, "Idea");
    let calls = 0;
    const model = new MockLanguageModelV4({
      doStream: async () => {
        calls++;
        throw new Error("should not be called");
      },
    });
    const res = await generateDraft({ userId, post, platform: "x", signal: AbortSignal.abort(), model });

    expect(res.status).toBe(499);
    expect(calls).toBe(0);
    expect((await eventsFor(post.id)).map((e) => e.type)).toEqual(["post_created"]);
  });

  it("over the cap, returns 429 with the reset time and makes no model call (AC-20)", async () => {
    const userId = newUser();
    const post = await createPost(userId, "Idea");
    const oldest = new Date(Date.now() - 23 * 3_600_000);
    await db.insert(events).values(
      Array.from({ length: 50 }, (_, i) => ({
        userId,
        postId: post.id,
        platform: "linkedin" as const,
        type: "generation_started" as const,
        createdAt: new Date(oldest.getTime() + i * 60_000),
      })),
    );

    let calls = 0;
    const model = new MockLanguageModelV4({
      doStream: async () => {
        calls++;
        throw new Error("should not be called");
      },
    });
    const res = await generateDraft({ userId, post, platform: "bluesky", model });

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(new Date(body.retryAt).getTime()).toBe(oldest.getTime() + 24 * 3_600_000);
    expect(body.error).toMatch(/You've used today's 50 drafts/);
    expect(calls).toBe(0);
    const started = (await eventsFor(post.id)).filter((e) => e.type === "generation_started");
    expect(started).toHaveLength(50); // the refused attempt isn't counted
  });
});

// Generates one platform's draft as a plain text stream (FR-10, FR-14).
//
// The response closes cleanly only after the draft is saved, so a client that
// reads to the end knows it succeeded. Any failure (model error, error part,
// empty output, timeout, the client leaving) errors the stream, records
// *generation failed*, and leaves the previous draft untouched.
import "server-only";
import { streamText, type LanguageModel } from "ai";
import type { Platform, Post } from "@/db/schema";
import { buildPrompt } from "@/lib/ai/prompts";
import { getModel, modelId as currentModelId } from "@/lib/ai/model";
import { rateLimit, rateLimitMessage } from "@/lib/domain/rate-limit";
import { saveGeneratedDraft } from "@/lib/drafts";
import { generationStartsSince, recordEvent } from "@/lib/events";

const TIMEOUT_MS = 90_000;

type Args = {
  userId: string;
  post: Pick<Post, "id" | "idea">;
  platform: Platform;
  /** Aborts the model call, e.g. the incoming request's signal. */
  signal?: AbortSignal;
  /** For tests; defaults to the configured model. */
  model?: LanguageModel;
  modelId?: string;
};

/** Splits generated text into stored content. X threads are parsed in 3.3. */
function toContent(text: string): string[] | null {
  const trimmed = text.trim();
  return trimmed ? [trimmed] : null;
}

export async function generateDraft({ userId, post, platform, signal, model, modelId }: Args): Promise<Response> {
  const limit = rateLimit(await generationStartsSince(userId, new Date(Date.now() - 24 * 3_600_000)));
  if (!limit.allowed) {
    return Response.json(
      { error: rateLimitMessage(limit.retryAt), retryAt: limit.retryAt.toISOString() },
      { status: 429 },
    );
  }

  const usedModel = modelId ?? currentModelId();
  await recordEvent({ userId, postId: post.id, platform, type: "generation_started", model: usedModel });

  const abort = new AbortController();
  signal?.addEventListener("abort", () => abort.abort(signal.reason), { once: true });

  const result = streamText({
    model: model ?? getModel(),
    ...buildPrompt(platform, post.idea),
    abortSignal: abort.signal,
    timeout: { totalMs: TIMEOUT_MS },
  });

  const encoder = new TextEncoder();
  const fail = (error: unknown) =>
    recordEvent({
      userId,
      postId: post.id,
      platform,
      type: "generation_failed",
      model: usedModel,
      error: (error instanceof Error ? error.message : String(error)).slice(0, 500),
    });

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let text = "";
      try {
        for await (const part of result.stream) {
          if (part.type === "text-delta") {
            text += part.text;
            controller.enqueue(encoder.encode(part.text));
          } else if (part.type === "error") {
            throw part.error;
          } else if (part.type === "abort") {
            throw new Error("Generation was stopped before it finished");
          }
        }
        if (abort.signal.aborted) throw new Error("Generation was stopped before it finished");
        const content = toContent(text);
        if (!content) throw new Error("The model returned an empty draft");
        await saveGeneratedDraft({ userId, postId: post.id, platform, content, model: usedModel });
        controller.close();
      } catch (error) {
        await fail(abort.signal.aborted ? "Generation was stopped before it finished" : error).catch(() => {});
        try {
          controller.error(error);
        } catch {
          // Already cancelled by the client.
        }
      }
    },
    cancel(reason) {
      // The client left: stop the model call; start() records the failure.
      abort.abort(reason);
    },
  });

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

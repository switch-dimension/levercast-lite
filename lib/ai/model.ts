// The model behind every draft. Real calls go through AI Gateway using a
// "provider/model" string (AI_GATEWAY_API_KEY locally, OIDC on Vercel).
// AI_MOCK=1 swaps in a deterministic mock for integration tests and E2E.
import { simulateReadableStream, type LanguageModel } from "ai";
import { MockLanguageModelV4 } from "ai/test";

export const DEFAULT_MODEL = "anthropic/claude-sonnet-5.5";

/**
 * Light editing doesn't need deep reasoning. At the provider default, Sonnet
 * 5.5 thought for ~3-5 s before the first word of LinkedIn and X drafts; at
 * "low" the first text arrives in ~1 s (NFR: ~3 s p50). Measured 2026-11-18.
 */
export const REASONING = "low" as const;

const isMock = () => process.env.AI_MOCK === "1";

/** The model ID recorded on drafts and events. */
export function modelId(): string {
  if (isMock()) return "mock";
  return process.env.AI_MODEL || DEFAULT_MODEL;
}

export function getModel(): LanguageModel {
  return isMock() ? mockModel() : modelId();
}

const MOCK_DRAFTS = {
  LinkedIn:
    "Clients don't buy hours. They buy the problem going away.\n\nThis is a mock LinkedIn draft, written in short paragraphs so the editor has something real to show.",
  X: "1/ Clients don't buy hours. They buy the problem going away.\n\n2/ This is a mock X thread with two tweets.",
  Bluesky: "Clients don't buy hours. They buy the problem going away. (Mock Bluesky draft.)",
} as const;

type CallOptions = Parameters<MockLanguageModelV4["doStream"]>[0];

const textOf = (options: CallOptions, role: "system" | "user") =>
  options.prompt
    .filter((m) => m.role === role)
    .map((m) => (typeof m.content === "string" ? m.content : m.content.map((p) => ("text" in p ? p.text : "")).join("")))
    .join("\n");

/**
 * Picks the mock draft for the platform named in the instructions. Test-only
 * directives in the idea shape the result: [mock:fail:<platform>],
 * [mock:empty], [mock:slow], [mock:long] (over every limit).
 */
function mockPlan(options: CallOptions) {
  const platform = (textOf(options, "system").match(/^Platform: (LinkedIn|X|Bluesky)\./m)?.[1] ??
    "LinkedIn") as keyof typeof MOCK_DRAFTS;
  const idea = textOf(options, "user");
  const long = idea.includes("[mock:long]");
  const text = idea.includes("[mock:empty]")
    ? ""
    : long
      ? platform === "X"
        ? `1/ ${"Over the limit. ".repeat(20)}\n\n2/ A short second tweet.`
        : `${MOCK_DRAFTS[platform]} ${"Much longer than the platform allows. ".repeat(platform === "LinkedIn" ? 90 : 10)}`
      : MOCK_DRAFTS[platform];
  return {
    text,
    fail: idea.toLowerCase().includes(`[mock:fail:${platform.toLowerCase()}]`),
    delay: idea.includes("[mock:slow]") ? 250 : 15,
  };
}

const mockDraft = (options: CallOptions) => mockPlan(options).text;

const mockUsage = (words: number) => ({
  inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: words, text: words, reasoning: undefined },
});

function mockModel() {
  return new MockLanguageModelV4({
    modelId: "mock",
    doGenerate: async (options) => {
      const text = mockDraft(options);
      return {
        content: [{ type: "text", text }],
        finishReason: { unified: "stop", raw: undefined },
        usage: mockUsage(text.split(/\s+/).length),
        warnings: [],
      };
    },
    doStream: async (options) => {
      const plan = mockPlan(options);
      if (plan.fail) throw new Error("Mock failure requested by the idea");
      // A few words per chunk, like a real stream.
      const words = plan.text.match(/\S+\s*/g) ?? [];
      const deltas = [];
      for (let i = 0; i < words.length; i += 3) deltas.push(words.slice(i, i + 3).join(""));

      return {
        stream: simulateReadableStream({
          chunkDelayInMs: plan.delay,
          chunks: [
            { type: "text-start", id: "text-1" },
            ...deltas.map((delta) => ({ type: "text-delta" as const, id: "text-1", delta })),
            { type: "text-end", id: "text-1" },
            {
              type: "finish",
              finishReason: { unified: "stop", raw: undefined },
              usage: mockUsage(words.length),
            },
          ],
        }),
      };
    },
  });
}

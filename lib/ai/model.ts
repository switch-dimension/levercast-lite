// The model behind every draft. Real calls go through AI Gateway using a
// "provider/model" string (AI_GATEWAY_API_KEY locally, OIDC on Vercel).
// AI_MOCK=1 swaps in a deterministic mock for integration tests and E2E.
import { simulateReadableStream, type LanguageModel } from "ai";
import { MockLanguageModelV4 } from "ai/test";

export const DEFAULT_MODEL = "anthropic/claude-sonnet-5.5";

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

/** Picks the mock draft for the platform named in the instructions. */
function mockDraft({ prompt }: CallOptions) {
  const system = prompt
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n");
  const platform = (system.match(/^Platform: (LinkedIn|X|Bluesky)\./m)?.[1] ??
    "LinkedIn") as keyof typeof MOCK_DRAFTS;
  return MOCK_DRAFTS[platform];
}

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
      // A few words per chunk, like a real stream.
      const words = mockDraft(options).match(/\S+\s*/g) ?? [];
      const deltas = [];
      for (let i = 0; i < words.length; i += 3) deltas.push(words.slice(i, i + 3).join(""));

      return {
        stream: simulateReadableStream({
          chunkDelayInMs: 15,
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

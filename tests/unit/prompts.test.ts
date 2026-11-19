import { afterEach, describe, expect, it, vi } from "vitest";
import { streamText } from "ai";
import { BANNED_OPENERS, buildPrompt } from "@/lib/ai/prompts";
import { DEFAULT_MODEL, getModel, modelId } from "@/lib/ai/model";
import { PLATFORMS, PLATFORM_FORMATS } from "@/lib/platforms";

const idea = "  Clients don't buy hours. They buy the problem going away.  ";

describe("buildPrompt", () => {
  it.each(PLATFORMS)("%s instructions carry every brand rule (FR-11)", (platform) => {
    const { instructions } = buildPrompt(platform, idea);

    for (const opener of BANNED_OPENERS) {
      expect(instructions).toContain(opener);
    }
    expect(instructions).toMatch(/question/i); // question-bait openers
    expect(instructions).toMatch(/As an expert/);
    expect(instructions).toMatch(/hashtag/i);
    expect(instructions).toMatch(/more than 3 hashtags/i);
    expect(instructions).toMatch(/emoji/i);
    expect(instructions).toMatch(/own words|phrasing/i);
    expect(instructions).toMatch(/opinion/i);
    expect(instructions).toMatch(/clarity/i);
    expect(instructions).toMatch(/clever/i);
  });

  it("LinkedIn targets one post of at most 3,000 characters in short paragraphs (FR-12)", () => {
    const { instructions } = buildPrompt("linkedin", idea);
    expect(instructions).toContain("3,000 characters");
    expect(instructions).toMatch(/short paragraphs/i);
  });

  it("X targets a numbered thread of 2–6 tweets of at most 280 characters (FR-12)", () => {
    const { instructions } = buildPrompt("x", idea);
    expect(instructions).toContain("280 characters");
    expect(instructions).toMatch(/2 to 6 tweets/);
    expect(instructions).toContain("1/");
    expect(instructions).toContain("2/");
  });

  it("Bluesky targets one post of at most 300 characters (FR-12)", () => {
    const { instructions } = buildPrompt("bluesky", idea);
    expect(instructions).toContain("300 characters");
  });

  it("puts the trimmed idea in the prompt, fenced off from the instructions", () => {
    const { instructions, prompt } = buildPrompt("linkedin", idea);
    expect(prompt).toContain("<idea>\nClients don't buy hours. They buy the problem going away.\n</idea>");
    expect(instructions).not.toContain("Clients don't buy hours");
  });

  it("names the platform so each prompt is distinct", () => {
    const prompts = PLATFORMS.map((p) => buildPrompt(p, idea).instructions);
    expect(new Set(prompts).size).toBe(3);
    for (const p of PLATFORMS) {
      expect(buildPrompt(p, idea).instructions).toContain(PLATFORM_FORMATS[p].label);
    }
  });
});

describe("model", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("defaults to the Gateway Sonnet model and honours AI_MODEL", () => {
    vi.stubEnv("AI_MOCK", "");
    vi.stubEnv("AI_MODEL", "");
    expect(DEFAULT_MODEL).toBe("anthropic/claude-sonnet-5.5");
    expect(modelId()).toBe(DEFAULT_MODEL);
    expect(getModel()).toBe(DEFAULT_MODEL);

    vi.stubEnv("AI_MODEL", "anthropic/claude-haiku-5.5");
    expect(modelId()).toBe("anthropic/claude-haiku-5.5");
    expect(getModel()).toBe("anthropic/claude-haiku-5.5");
  });

  it("AI_MOCK=1 swaps in a mock that streams a platform-shaped draft", async () => {
    vi.stubEnv("AI_MOCK", "1");
    expect(modelId()).toBe("mock");

    const draft = async (platform: (typeof PLATFORMS)[number]) => {
      const result = streamText({ model: getModel(), ...buildPrompt(platform, idea) });
      let streamed = "";
      let chunks = 0;
      for await (const delta of result.textStream) {
        streamed += delta;
        chunks++;
      }
      expect(chunks).toBeGreaterThan(1); // arrives a few words at a time
      expect(await result.text).toBe(streamed);
      return streamed;
    };

    const x = await draft("x");
    expect(x).toMatch(/^1\/ /);
    expect(x).toMatch(/\n\n2\/ /);

    const linkedin = await draft("linkedin");
    expect(linkedin).not.toMatch(/^1\//);
    expect(linkedin.length).toBeLessThanOrEqual(3000);

    const bluesky = await draft("bluesky");
    expect(bluesky.length).toBeLessThanOrEqual(300);
  });
});

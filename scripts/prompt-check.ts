// Prompt-quality check (AC-13). Generates LinkedIn, X, and Bluesky drafts for
// each idea in a text file and writes them to a markdown file for review.
//
//   node scripts/prompt-check.ts ideas.txt
//
// Separate ideas with a line containing only `---`. Calls the real model
// through AI Gateway (AI_GATEWAY_API_KEY from .env.local) unless AI_MOCK=1.
// The automatic flags are a first pass only: the founder's read is the check.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { config } from "dotenv";
import { generateText } from "ai";
import { BANNED_OPENERS, buildPrompt } from "../lib/ai/prompts.ts";
import { getModel, modelId } from "../lib/ai/model.ts";
import { PLATFORMS, PLATFORM_FORMATS, type Platform } from "../lib/platforms.ts";

config({ path: ".env.local", quiet: true });

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/prompt-check.ts <ideas-file>\nSeparate ideas with a line containing only ---");
  process.exit(1);
}

const ideas = readFileSync(file, "utf8")
  .split(/^---\s*$/m)
  .map((s) => s.trim())
  .filter(Boolean);
if (ideas.length === 0) {
  console.error(`No ideas found in ${file}.`);
  process.exit(1);
}

/** Rough length check. Exact X and Bluesky counting arrives in task 3.3. */
const length = (s: string) => [...s].length;

function flags(platform: Platform, text: string): string[] {
  const out: string[] = [];
  const opening = text.replace(/^1\/\s*/, "").trimStart();
  const opener = BANNED_OPENERS.find((o) => opening.toLowerCase().startsWith(o.toLowerCase()));
  if (opener) out.push(`opens with "${opener}"`);
  const firstSentence = opening.split(/(?<=[.!?])\s/)[0] ?? "";
  if (firstSentence.endsWith("?")) out.push("opens with a question");
  const hashtags = text.match(/(^|\s)#\w+/g)?.length ?? 0;
  if (hashtags > 3) out.push(`${hashtags} hashtags`);
  if (/^\s*\p{Extended_Pictographic}/mu.test(text)) out.push("emoji bullet");
  if (/\*\*|^#{1,6}\s|^\s*[-*]\s/m.test(text)) out.push("Markdown formatting");

  if (platform === "x") {
    const tweets = text.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean);
    const { minTweets, maxTweets, charLimit } = PLATFORM_FORMATS.x;
    if (tweets.length < minTweets || tweets.length > maxTweets) out.push(`${tweets.length} tweets`);
    tweets.forEach((t, i) => {
      if (!t.startsWith(`${i + 1}/`)) out.push(`tweet ${i + 1} isn't numbered "${i + 1}/"`);
      if (length(t) > charLimit) out.push(`tweet ${i + 1} is ${length(t)} characters`);
    });
  } else if (length(text) > PLATFORM_FORMATS[platform].charLimit) {
    out.push(`${length(text)} characters`);
  }
  return out;
}

async function draft(platform: Platform, idea: string) {
  try {
    const { text } = await generateText({
      model: getModel(),
      ...buildPrompt(platform, idea),
      abortSignal: AbortSignal.timeout(90_000),
    });
    return { text: text.trim(), flags: flags(platform, text.trim()) };
  } catch (error) {
    return { text: "", flags: [`failed: ${error instanceof Error ? error.message : String(error)}`] };
  }
}

const now = new Date();
const date = now.toISOString().slice(0, 10);
let out = `prompt-check-${date}.md`;
for (let n = 2; existsSync(out); n++) out = `prompt-check-${date}-${n}.md`;

const sections: string[] = [];
let flagged = 0;
for (const [i, idea] of ideas.entries()) {
  console.log(`Idea ${i + 1} of ${ideas.length}…`);
  const drafts = await Promise.all(PLATFORMS.map((p) => draft(p, idea)));
  const body = PLATFORMS.map((p, j) => {
    const { text, flags } = drafts[j];
    if (flags.length) flagged++;
    const flagLine = flags.length ? `**Flags:** ${flags.join("; ")}` : "**Flags:** none";
    return `### ${PLATFORM_FORMATS[p].label} (${length(text)} chars)\n\n${flagLine}\n\n\`\`\`text\n${text}\n\`\`\`\n\n- [ ] I'd post this with light edits`;
  }).join("\n\n");
  sections.push(`## Idea ${i + 1}\n\n> ${idea.replace(/\n/g, "\n> ")}\n\n${body}`);
}

writeFileSync(
  out,
  `# Prompt check, ${date}\n\nModel: \`${modelId()}\` · ${ideas.length} ideas · ${now.toISOString()}\n\n` +
    `AC-13: no generic hook opener, no question-bait opener, no emoji bullets, at most 3 hashtags, and each draft keeps at least one distinctive phrase or opinion from the idea. The flags below are a rough automatic pass; your read is the check.\n\n` +
    `${sections.join("\n\n---\n\n")}\n`,
);
console.log(`Wrote ${out} (${flagged} of ${ideas.length * PLATFORMS.length} drafts flagged).`);

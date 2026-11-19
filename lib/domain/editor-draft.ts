// The draft shape the editor works with (dates as ISO strings for the client).
import type { Draft, Platform } from "@/db/schema";

export type EditorDraft = {
  platform: Platform;
  content: string[];
  generatedContent: string[];
  generatedAt: string;
  updatedAt: string;
};

export function toEditorDraft(draft: Draft): EditorDraft {
  return {
    platform: draft.platform,
    content: draft.content,
    generatedContent: draft.generatedContent,
    generatedAt: draft.generatedAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
  };
}

/** Generous caps for an edited draft; the UI never adds or removes tweets. */
export const DRAFT_TEXT_MAX = 20_000;
export const DRAFT_PARTS_MAX = 20;
const PLATFORM_NAMES: readonly string[] = ["linkedin", "x", "bluesky"];

/** Checks an edit sent from the client: a known platform, and text[] of the right shape. */
export function isValidDraftEdit(platform: unknown, content: unknown): platform is Platform {
  if (typeof platform !== "string" || !PLATFORM_NAMES.includes(platform)) return false;
  if (!Array.isArray(content) || content.length === 0 || content.length > DRAFT_PARTS_MAX) return false;
  if (platform !== "x" && content.length !== 1) return false;
  return content.every((part) => typeof part === "string" && part.length <= DRAFT_TEXT_MAX);
}

export type DraftState = "empty" | "writing" | "failed" | "stale" | "ready";

export const DRAFT_STATE_LABEL: Record<DraftState, string> = {
  empty: "Not generated",
  writing: "Writing…",
  failed: "Didn't finish",
  stale: "Idea changed",
  ready: "Draft ready",
};

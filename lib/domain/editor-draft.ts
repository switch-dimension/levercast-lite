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

export type DraftState = "empty" | "writing" | "failed" | "stale" | "ready";

export const DRAFT_STATE_LABEL: Record<DraftState, string> = {
  empty: "Not generated",
  writing: "Writing…",
  failed: "Didn't finish",
  stale: "Idea changed",
  ready: "Draft ready",
};

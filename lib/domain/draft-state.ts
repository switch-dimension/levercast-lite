// Derived draft facts the editor acts on (FR-15, FR-20).
import type { DraftState } from "./editor-draft.ts";
import { PLATFORMS, type Platform } from "../platforms.ts";

/** The idea was edited after this draft was generated (ISO timestamps). */
export function isStale(draft: { generatedAt: string }, ideaUpdatedAt: string): boolean {
  return new Date(draft.generatedAt).getTime() < new Date(ideaUpdatedAt).getTime();
}

/** A panel's state: a run in progress or failed first, then the draft itself. */
export function draftState({
  run,
  draft,
  ideaUpdatedAt,
}: {
  run?: "idle" | "writing" | "failed";
  draft?: { generatedAt: string };
  ideaUpdatedAt: string;
}): DraftState {
  if (run === "writing" || run === "failed") return run;
  if (!draft) return "empty";
  return isStale(draft, ideaUpdatedAt) ? "stale" : "ready";
}

type DraftTexts = { content: string[]; generatedContent: string[] };

/** The user has changed the draft since it was generated. */
export function isEdited({ content, generatedContent }: DraftTexts): boolean {
  return content.length !== generatedContent.length || content.some((part, i) => part !== generatedContent[i]);
}

/**
 * Regenerate all: drafts that are missing or unedited regenerate at once;
 * edited drafts ask first, in their own panel.
 */
export function planRegenerateAll(drafts: Partial<Record<Platform, DraftTexts>>): {
  now: Platform[];
  confirm: Platform[];
} {
  const now: Platform[] = [];
  const confirm: Platform[] = [];
  for (const platform of PLATFORMS) {
    const draft = drafts[platform];
    (draft && isEdited(draft) ? confirm : now).push(platform);
  }
  return { now, confirm };
}

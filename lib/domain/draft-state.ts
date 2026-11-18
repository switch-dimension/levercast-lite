// Derived draft facts the editor acts on (FR-15, FR-20).
import { PLATFORMS, type Platform } from "../platforms.ts";

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

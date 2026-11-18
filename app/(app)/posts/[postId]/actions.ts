"use server";

import { requireUser } from "@/lib/dal";
import { getDrafts, updateDraftContent } from "@/lib/drafts";
import { isValidDraftEdit, toEditorDraft, type EditorDraft } from "@/lib/domain/editor-draft";
import { recordDraftCopied } from "@/lib/events";
import type { Platform } from "@/lib/platforms";

/** The post's current drafts, for the editor to refresh after a generation. */
export async function loadDrafts(postId: string): Promise<EditorDraft[]> {
  const user = await requireUser();
  return (await getDrafts(user.id, postId)).map(toEditorDraft);
}

/**
 * Called after the clipboard write succeeds: saves the copied draft and
 * records *draft copied* (FR-19, FR-22). `tweet` is the 1-based tweet number.
 */
export async function copyDraft(postId: string, platform: Platform, content: string[], tweet?: number): Promise<void> {
  const user = await requireUser();
  if (!isValidDraftEdit(platform, content)) throw new Error("Invalid draft");
  if (tweet !== undefined && typeof tweet !== "number") throw new Error("Invalid tweet");
  if (!(await recordDraftCopied({ userId: user.id, postId, platform, content, tweet }))) {
    throw new Error("Draft not found");
  }
}

/** Autosave for an edited draft (FR-18). Throws so the editor shows "Couldn't save". */
export async function saveDraft(postId: string, platform: Platform, content: string[]): Promise<void> {
  const user = await requireUser();
  if (!isValidDraftEdit(platform, content)) throw new Error("Invalid draft");
  if (!(await updateDraftContent(user.id, postId, platform, content))) throw new Error("Draft not found");
}

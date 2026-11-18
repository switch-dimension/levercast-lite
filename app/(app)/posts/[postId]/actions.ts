"use server";

import { requireUser } from "@/lib/dal";
import { getDrafts, updateDraftContent } from "@/lib/drafts";
import { isValidDraftEdit, toEditorDraft, type EditorDraft } from "@/lib/domain/editor-draft";
import type { Platform } from "@/lib/platforms";

/** The post's current drafts, for the editor to refresh after a generation. */
export async function loadDrafts(postId: string): Promise<EditorDraft[]> {
  const user = await requireUser();
  return (await getDrafts(user.id, postId)).map(toEditorDraft);
}

/** Autosave for an edited draft (FR-18). Throws so the editor shows "Couldn't save". */
export async function saveDraft(postId: string, platform: Platform, content: string[]): Promise<void> {
  const user = await requireUser();
  if (!isValidDraftEdit(platform, content)) throw new Error("Invalid draft");
  if (!(await updateDraftContent(user.id, postId, platform, content))) throw new Error("Draft not found");
}

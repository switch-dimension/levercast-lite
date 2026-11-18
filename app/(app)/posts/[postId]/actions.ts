"use server";

import { requireUser } from "@/lib/dal";
import { getDrafts } from "@/lib/drafts";
import { toEditorDraft, type EditorDraft } from "@/lib/domain/editor-draft";

/** The post's current drafts, for the editor to refresh after a generation. */
export async function loadDrafts(postId: string): Promise<EditorDraft[]> {
  const user = await requireUser();
  return (await getDrafts(user.id, postId)).map(toEditorDraft);
}

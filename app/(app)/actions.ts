"use server";

// Thin Server Action wrappers over lib/posts. Each one re-checks the user.
import { requireUser } from "@/lib/dal";
import { createPost, updateIdea } from "@/lib/posts";

export type SaveIdeaResult = { postId: string | null; ideaUpdatedAt: string | null };

/**
 * Autosave for the idea box. With no postId, the first non-empty save
 * creates the post (FR-7); later saves update it.
 */
export async function saveIdea(postId: string | null, idea: string): Promise<SaveIdeaResult> {
  const user = await requireUser();
  if (!postId) {
    if (!idea.trim()) return { postId: null, ideaUpdatedAt: null };
    const post = await createPost(user.id, idea);
    return { postId: post.id, ideaUpdatedAt: post.ideaUpdatedAt.toISOString() };
  }
  const post = await updateIdea(user.id, postId, idea);
  if (!post) throw new Error("Post not found");
  return { postId: post.id, ideaUpdatedAt: post.ideaUpdatedAt.toISOString() };
}

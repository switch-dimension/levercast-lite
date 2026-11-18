"use server";

// Thin Server Action wrappers over lib/posts. Each one re-checks the user.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createPost, softDeletePost, updateIdea } from "@/lib/posts";

/** Soft-deletes a post (its events are kept) and returns to My posts (FR-9). */
export async function deletePost(postId: string): Promise<{ error: string }> {
  const user = await requireUser();
  if (!(await softDeletePost(user.id, postId))) {
    return { error: "We couldn't delete this post. It may already be gone." };
  }
  // Next keeps visited pages (e.g. Home's recent cards) to show again;
  // drop those copies so the deleted post doesn't reappear.
  revalidatePath("/posts");
  revalidatePath("/");
  redirect("/posts");
}

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

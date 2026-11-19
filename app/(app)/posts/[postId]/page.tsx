import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostEditor } from "@/components/editor/post-editor";
import { requireUser } from "@/lib/dal";
import { toEditorDraft } from "@/lib/domain/editor-draft";
import { getDrafts } from "@/lib/drafts";
import { getPost } from "@/lib/posts";

// The editor needs the post before it can show anything, so it blocks on the
// server instead of streaming. That also lets a missing, deleted or
// someone else's post return a real 404 status (AC-6), not a streamed one.
export const instant = false;

export const metadata: Metadata = { title: "Post · Levercast" };

export default async function PostPage({ params, searchParams }: PageProps<"/posts/[postId]">) {
  const { postId } = await params;
  const user = await requireUser();
  const post = await getPost(user.id, postId);
  if (!post) notFound();
  const [drafts, { generate }] = await Promise.all([getDrafts(user.id, post.id), searchParams]);

  return (
    <PostEditor
      post={{
        id: post.id,
        idea: post.idea,
        ideaUpdatedAt: post.ideaUpdatedAt.toISOString(),
        createdAt: post.createdAt.toISOString(),
      }}
      initialDrafts={drafts.map(toEditorDraft)}
      autoGenerate={generate === "1"}
    />
  );
}

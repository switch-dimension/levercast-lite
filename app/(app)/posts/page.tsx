import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PostCard } from "@/components/post-card";
import { requireUser } from "@/lib/dal";
import { listPosts } from "@/lib/posts";

export const metadata: Metadata = { title: "My posts · Levercast" };

export default function MyPostsPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] flex-1 px-5 pb-28 pt-8 md:px-8 md:pt-12">
      <Link href="/" className="btn btn-ghost -ml-2.5">
        ← New post
      </Link>
      <h1 className="mb-6 mt-2 font-serif text-[36px] leading-[1.15]">My posts</h1>
      <Suspense fallback={<p className="text-caption text-neutral">Loading your posts…</p>}>
        <PostList />
      </Suspense>
    </main>
  );
}

async function PostList() {
  const user = await requireUser();
  const posts = await listPosts(user.id);
  if (!posts.length) {
    return (
      <p className="py-2 font-serif text-[17px] italic text-neutral">
        Nothing here yet.{" "}
        <Link href="/" className="text-accent-strong underline-offset-4 hover:underline">
          Start with a rough idea.
        </Link>
      </p>
    );
  }
  const now = new Date();
  return (
    <ul className="grid gap-3">
      {posts.map((post) => (
        <li key={post.id}>
          <PostCard post={post} now={now} />
        </li>
      ))}
    </ul>
  );
}

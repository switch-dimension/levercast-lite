import Link from "next/link";
import { Suspense } from "react";
import { IdeaBox } from "@/components/idea-box";
import { PostCard } from "@/components/post-card";
import { requireUser } from "@/lib/dal";
import { listPosts } from "@/lib/posts";

// Home: the writing box is the New post action, with up to 4 recent posts
// below it (FR-6). A user with no posts sees only the writing box.
export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-[760px] flex-1 px-5 pb-28 pt-10 md:px-8 md:pt-[88px]">
      <h1
        id="home-heading"
        className="mb-7 font-serif text-[32px] font-light leading-[1.15] tracking-[-0.015em] md:text-[44px]"
      >
        What&rsquo;s been on your mind this week?
      </h1>
      <IdeaBox variant="home" labelledBy="home-heading" />
      <Suspense fallback={null}>
        <RecentPosts />
      </Suspense>
    </main>
  );
}

async function RecentPosts() {
  const user = await requireUser();
  const posts = await listPosts(user.id, { limit: 4 });
  if (!posts.length) return null;
  const now = new Date();
  return (
    <section aria-labelledby="recent-heading" className="mt-[72px]">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 id="recent-heading" className="eyebrow">
          Recent
        </h2>
        <Link href="/posts" className="text-caption text-neutral hover:text-on-surface">
          All posts →
        </Link>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {posts.map((post) => (
          <li key={post.id} className="grid">
            <PostCard post={post} now={now} />
          </li>
        ))}
      </ul>
    </section>
  );
}

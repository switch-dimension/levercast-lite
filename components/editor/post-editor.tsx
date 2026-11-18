"use client";

import Link from "next/link";
import { DeletePostDialog } from "@/components/editor/delete-post-dialog";
import { IdeaBox } from "@/components/idea-box";
import { relativeTime } from "@/lib/domain/post-status";
import { PLATFORMS, PLATFORM_FORMATS, type Platform } from "@/lib/platforms";

export type EditorPost = { id: string; idea: string; ideaUpdatedAt: string; createdAt: string };

const FORMAT_HINT: Record<Platform, string> = {
  linkedin: `up to ${PLATFORM_FORMATS.linkedin.charLimit.toLocaleString("en-US")} characters`,
  x: `${PLATFORM_FORMATS.x.minTweets}–${PLATFORM_FORMATS.x.maxTweets} tweets, ${PLATFORM_FORMATS.x.charLimit} each`,
  bluesky: `up to ${PLATFORM_FORMATS.bluesky.charLimit} characters`,
};

/** The post editor: the idea at the top, one section per platform below. */
export function PostEditor({ post }: { post: EditorPost }) {
  return (
    <>
      <nav aria-label="Post" className="sticky top-0 z-10 border-b border-border bg-surface/95">
        <div className="mx-auto flex w-full max-w-[760px] flex-wrap items-center gap-1 px-5 py-2 md:px-8">
          <Link href="/posts" className="btn btn-ghost -ml-2.5">
            ← My posts
          </Link>
          <span className="flex-1" />
          {PLATFORMS.map((platform) => (
            <a key={platform} href={`#draft-${platform}`} className="btn btn-ghost btn-sm gap-2">
              <span aria-hidden className="dot dot-empty" />
              {PLATFORM_FORMATS[platform].label}
              <span className="hidden text-caption font-normal text-neutral sm:inline">Not generated</span>
            </a>
          ))}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-[760px] flex-1 px-5 pb-28 pt-8 md:px-8 md:pt-12">
        <IdeaBox variant="editor" postId={post.id} initialIdea={post.idea} />

        <div className="mt-14 grid gap-12">
          {PLATFORMS.map((platform) => (
            <section
              key={platform}
              id={`draft-${platform}`}
              aria-labelledby={`draft-${platform}-heading`}
              className="scroll-mt-20"
            >
              <div className="mb-4 flex items-baseline gap-3 border-b border-primary pb-2.5">
                <h2 id={`draft-${platform}-heading`} className="font-serif text-headline-sm">
                  {PLATFORM_FORMATS[platform].label}
                </h2>
                <span className="text-caption text-neutral">{FORMAT_HINT[platform]}</span>
                <span className="flex-1" />
                <span className="inline-flex items-center gap-2 text-caption text-neutral">
                  <span aria-hidden className="dot dot-empty" />
                  Not generated
                </span>
              </div>
              <p className="py-2 font-serif text-[17px] italic text-neutral">Not generated yet.</p>
            </section>
          ))}
        </div>

        <footer className="mt-[72px] flex items-center justify-between border-t border-border pt-5">
          <span className="text-caption text-neutral">
            Created <time dateTime={post.createdAt}>{relativeTime(new Date(post.createdAt))}</time>
          </span>
          <DeletePostDialog postId={post.id} />
        </footer>
      </main>
    </>
  );
}

import Link from "next/link";
import { DRAFT_STATE_LABEL, type DraftState } from "@/lib/domain/editor-draft";
import { PLATFORMS, PLATFORM_FORMATS, type Platform } from "@/lib/platforms";

/** Sticky strip under the top bar: back link plus each platform's state. */
export function StatusStrip({ states }: { states: Record<Platform, DraftState> }) {
  return (
    <nav aria-label="Post" className="sticky top-0 z-10 border-b border-border bg-surface/95">
      <div className="mx-auto flex w-full max-w-[760px] flex-wrap items-center gap-1 px-5 py-2 md:px-8">
        <Link href="/posts" className="btn btn-ghost -ml-2.5">
          ← My posts
        </Link>
        <span className="flex-1" />
        {PLATFORMS.map((platform) => (
          <a key={platform} href={`#draft-${platform}`} className="btn btn-ghost btn-sm gap-2">
            <span aria-hidden className={`dot dot-${states[platform]}`} />
            {PLATFORM_FORMATS[platform].label}
            <span className="sr-only">:</span>
            <span className="hidden text-caption font-normal text-neutral sm:inline">
              {DRAFT_STATE_LABEL[states[platform]]}
            </span>
          </a>
        ))}
      </div>
    </nav>
  );
}

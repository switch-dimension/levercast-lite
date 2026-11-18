"use client";

import { CharCount } from "@/components/editor/char-count";
import { isOverLimit } from "@/lib/domain/limits";

/** An X thread: one block per tweet, each with its own count against 280 (FR-13). */
export function XThreadPanel({ tweets }: { tweets: string[] }) {
  return (
    <ol className="grid">
      {tweets.map((tweet, i) => (
        <li key={i} className="grid gap-0.5 border-b border-dashed border-border pb-2.5 pt-1.5 last:border-b-0">
          <p
            className={`whitespace-pre-wrap rounded-sm px-2.5 py-2 font-serif text-[18px] leading-[1.65] -mx-2.5 ${
              isOverLimit("x", tweet) ? "bg-[#fbeeed]" : ""
            }`}
          >
            {tweet}
          </p>
          <div className="flex items-center justify-end gap-1.5">
            <CharCount platform="x" text={tweet} />
          </div>
        </li>
      ))}
    </ol>
  );
}

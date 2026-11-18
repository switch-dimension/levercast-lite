"use client";

import { CharCount } from "@/components/editor/char-count";
import { DraftTextarea } from "@/components/editor/draft-textarea";
import { isOverLimit } from "@/lib/domain/limits";

type Props = {
  tweets: string[];
  onChange: (tweets: string[]) => void;
};

/** An X thread: one editable block per tweet, each with its own count against 280 (FR-13, FR-18). */
export function XThreadPanel({ tweets, onChange }: Props) {
  const edit = (i: number, text: string) => onChange(tweets.map((t, j) => (j === i ? text : t)));

  return (
    <ol className="grid">
      {tweets.map((tweet, i) => (
        <li key={i} className="grid gap-0.5 border-b border-dashed border-border pb-2.5 pt-1.5 last:border-b-0">
          <DraftTextarea
            label={`Tweet ${i + 1}`}
            value={tweet}
            over={isOverLimit("x", tweet)}
            onChange={(text) => edit(i, text)}
          />
          <div className="flex items-center justify-end gap-1.5">
            <CharCount platform="x" text={tweet} />
          </div>
        </li>
      ))}
    </ol>
  );
}

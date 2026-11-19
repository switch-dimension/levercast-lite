"use client";

import { CharCount } from "@/components/editor/char-count";
import { CopyButton } from "@/components/editor/copy-button";
import { DraftTextarea } from "@/components/editor/draft-textarea";
import { isOverLimit } from "@/lib/domain/limits";

type Props = {
  tweets: string[];
  onChange: (tweets: string[]) => void;
  /** A single tweet was copied; `tweet` is its 1-based number. */
  onCopied: (tweet: number) => void | Promise<void>;
  onCopyBlocked: () => void;
};

/**
 * An X thread: one editable block per tweet, each with its own count against
 * 280 and its own Copy (FR-13, FR-18, FR-19).
 */
export function XThreadPanel({ tweets, onChange, onCopied, onCopyBlocked }: Props) {
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
            <CopyButton
              label="Copy"
              ariaLabel={`Copy tweet ${i + 1}`}
              variant="ghost"
              text={tweet}
              onCopied={() => onCopied(i + 1)}
              onBlocked={onCopyBlocked}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

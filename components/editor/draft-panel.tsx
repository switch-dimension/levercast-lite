"use client";

import { CharCount } from "@/components/editor/char-count";
import { XThreadPanel } from "@/components/editor/x-thread-panel";
import type { PanelRun } from "@/hooks/use-generation";
import { isOverLimit } from "@/lib/domain/limits";
import { DRAFT_STATE_LABEL, type DraftState, type EditorDraft } from "@/lib/domain/editor-draft";
import { PLATFORM_FORMATS, type Platform } from "@/lib/platforms";

const FORMAT_HINT: Record<Platform, string> = {
  linkedin: `up to ${PLATFORM_FORMATS.linkedin.charLimit.toLocaleString("en-US")} characters`,
  x: `${PLATFORM_FORMATS.x.minTweets}–${PLATFORM_FORMATS.x.maxTweets} tweets, ${PLATFORM_FORMATS.x.charLimit} each`,
  bluesky: `up to ${PLATFORM_FORMATS.bluesky.charLimit} characters`,
};

type Props = {
  platform: Platform;
  state: DraftState;
  draft?: EditorDraft;
  run?: PanelRun;
  onRetry: () => void;
};

/** One platform's section in the editor (FR-10, FR-14). */
export function DraftPanel({ platform, state, draft, run, onRetry }: Props) {
  const { label } = PLATFORM_FORMATS[platform];
  const writing = run?.status === "writing";

  return (
    <section id={`draft-${platform}`} aria-labelledby={`draft-${platform}-heading`} className="scroll-mt-20">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-primary pb-2.5">
        <h2 id={`draft-${platform}-heading`} className="font-serif text-headline-sm">
          {label}
        </h2>
        <span className="text-caption text-neutral">{FORMAT_HINT[platform]}</span>
        <span className="flex-1" />
        <span className="inline-flex items-center gap-2 text-caption text-neutral">
          <span aria-hidden className={`dot dot-${state}`} />
          {DRAFT_STATE_LABEL[state]}
        </span>
      </div>

      {/* Announced once the stream settles, not word by word. */}
      <div aria-live="polite" aria-busy={writing}>
        {writing ? (
          <div>
            <p className="inline-flex items-center gap-2 text-caption text-neutral">
              <span aria-hidden className="dot dot-writing" />
              Writing your {label} draft
            </p>
            <p className="mt-2 min-h-[3em] whitespace-pre-wrap font-serif text-[18px] leading-[1.65]">{run.text}</p>
          </div>
        ) : (
          <>
            {run?.status === "failed" && (
              <div
                role="alert"
                className="mb-3 flex flex-wrap items-center gap-2.5 rounded-sm bg-[#fbeeed] px-3.5 py-3 text-ui-body text-error"
              >
                <span>{run.error}</span>
                <span className="flex-1" />
                <button type="button" className="btn btn-secondary btn-sm text-on-surface" onClick={onRetry}>
                  Try again
                </button>
              </div>
            )}
            {draft ? (
              <DraftText platform={platform} draft={draft} />
            ) : (
              run?.status !== "failed" && (
                <p className="py-2 font-serif text-[17px] italic text-neutral">Not generated yet.</p>
              )
            )}
          </>
        )}
      </div>
    </section>
  );
}

function DraftText({ platform, draft }: { platform: Platform; draft: EditorDraft }) {
  if (platform === "x") {
    return (
      <>
        <XThreadPanel tweets={draft.content} />
        <div className="mt-3 flex items-center justify-end">
          <span className="text-caption text-neutral">{draft.content.length} tweets</span>
        </div>
      </>
    );
  }
  const text = draft.content.join("\n\n");
  return (
    <>
      <p
        className={`whitespace-pre-wrap rounded-sm px-2.5 py-2 font-serif text-[18px] leading-[1.65] -mx-2.5 ${
          isOverLimit(platform, text) ? "bg-[#fbeeed]" : ""
        }`}
      >
        {text}
      </p>
      <div className="mt-3 flex items-center justify-end">
        <CharCount platform={platform} text={text} />
      </div>
    </>
  );
}

"use client";

import { useCallback, useState } from "react";
import { copyDraft, saveDraft } from "@/app/(app)/posts/[postId]/actions";
import { CharCount } from "@/components/editor/char-count";
import { CopyButton } from "@/components/editor/copy-button";
import { RegenerateConfirm } from "@/components/editor/regenerate-confirm";
import { DraftTextarea } from "@/components/editor/draft-textarea";
import { XThreadPanel } from "@/components/editor/x-thread-panel";
import { SAVE_TEXT, useAutosave } from "@/hooks/use-autosave";
import type { PanelRun } from "@/hooks/use-generation";
import { isEdited } from "@/lib/domain/draft-state";
import { isOverLimit } from "@/lib/domain/limits";
import { joinThread } from "@/lib/domain/thread";
import { DRAFT_STATE_LABEL, type DraftState, type EditorDraft } from "@/lib/domain/editor-draft";
import { PLATFORM_FORMATS, type Platform } from "@/lib/platforms";

const FORMAT_HINT: Record<Platform, string> = {
  linkedin: `up to ${PLATFORM_FORMATS.linkedin.charLimit.toLocaleString("en-US")} characters`,
  x: `${PLATFORM_FORMATS.x.minTweets}–${PLATFORM_FORMATS.x.maxTweets} tweets, ${PLATFORM_FORMATS.x.charLimit} each`,
  bluesky: `up to ${PLATFORM_FORMATS.bluesky.charLimit} characters`,
};

type Props = {
  postId: string;
  platform: Platform;
  state: DraftState;
  draft?: EditorDraft;
  run?: PanelRun;
  onRetry: () => void;
  onEdit: (content: string[]) => void;
  /** Regenerate this platform; the editor decides whether to ask first. */
  onRegenerate: () => void;
  /** Set while this panel asks "Keep my edit / Replace it". */
  confirm?: ConfirmProps;
};

export type ConfirmProps = { autoFocus: boolean; onKeep: () => void; onReplace: () => void };

/** One platform's section in the editor (FR-10, FR-14, FR-15). */
export function DraftPanel({ postId, platform, state, draft, run, onRetry, onEdit, onRegenerate, confirm }: Props) {
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
        <span className="inline-flex items-center gap-2 text-caption text-neutral" aria-live="polite">
          <span aria-hidden className={`dot dot-${state}`} />
          {DRAFT_STATE_LABEL[state]}
        </span>
      </div>

      {/* Announced once the stream settles, not word by word; edits aren't announced. */}
      <div aria-live="polite" aria-busy={writing}>
        {writing ? (
          <div>
            <p className="inline-flex items-center gap-2 text-caption text-neutral">
              <span aria-hidden className="dot dot-writing" />
              Writing your {label} draft
            </p>
            <p className="mt-2 min-h-[3em] whitespace-pre-wrap font-serif text-[18px] leading-[1.65]">{run.text}</p>
          </div>
        ) : null}
      </div>
      {!writing && (
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
              <DraftBody
                key={draft.generatedAt}
                postId={postId}
                platform={platform}
                draft={draft}
                confirm={confirm}
                onEdit={onEdit}
                onRegenerate={onRegenerate}
              />
            ) : (
              run?.status !== "failed" && (
                <p className="py-2 font-serif text-[17px] italic text-neutral">Not generated yet.</p>
              )
            )}
          </>
      )}
    </section>
  );
}

type BodyProps = {
  postId: string;
  platform: Platform;
  draft: EditorDraft;
  confirm?: ConfirmProps;
  onEdit: (content: string[]) => void;
  onRegenerate: () => void;
};

/**
 * The editable draft. Remounted for each new generation, so a pending edit is
 * saved (on unmount) before the new draft arrives, never after it.
 */
function DraftBody({ postId, platform, draft, confirm, onEdit, onRegenerate }: BodyProps) {
  const save = useCallback((content: string[]) => saveDraft(postId, platform, content), [postId, platform]);
  const autosave = useAutosave(save);
  const { label } = PLATFORM_FORMATS[platform];

  const [copyBlocked, setCopyBlocked] = useState(false);

  function change(content: string[]) {
    onEdit(content);
    autosave.schedule(content);
  }

  // The clipboard already holds the text; this saves pending edits and
  // records *draft copied*. A failure here costs only the event.
  async function copied(tweet?: number) {
    setCopyBlocked(false);
    await autosave.flush();
    await copyDraft(postId, platform, draft.content, tweet).catch(() => {});
  }
  const copyBlockedNow = () => setCopyBlocked(true);

  const text = joinThread(draft.content);
  return (
    <>
      {copyBlocked && (
        <p role="alert" className="mb-3 rounded-sm bg-[#fbeeed] px-3.5 py-3 text-ui-body text-error">
          Couldn&apos;t copy. Select the text and copy it manually.
        </p>
      )}
      {platform === "x" ? (
        <XThreadPanel tweets={draft.content} onChange={change} onCopied={copied} onCopyBlocked={copyBlockedNow} />
      ) : (
        <DraftTextarea
          label={`${label} draft`}
          value={text}
          over={isOverLimit(platform, text)}
          onChange={(value) => change([value])}
        />
      )}
      <div className="mt-3 flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
        {platform === "x" ? (
          <span className="text-caption text-neutral">{draft.content.length} tweets</span>
        ) : (
          <CharCount platform={platform} text={text} />
        )}
        {isEdited(draft) && <span className="text-caption text-neutral">· Edited</span>}
        <span
          role="status"
          className={`text-caption ${autosave.status === "error" ? "text-error" : "text-neutral"}`}
        >
          {SAVE_TEXT[autosave.status]}
        </span>
        <span className="flex-1" />
        <button type="button" className="btn btn-ghost btn-sm" disabled={!!confirm} onClick={onRegenerate}>
          Regenerate
        </button>
        <CopyButton
          label={platform === "x" ? "Copy thread" : "Copy"}
          text={text}
          onCopied={() => copied()}
          onBlocked={copyBlockedNow}
        />
      </div>
      {confirm && <RegenerateConfirm {...confirm} />}
    </>
  );
}

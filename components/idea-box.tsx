"use client";

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { saveIdea } from "@/app/(app)/actions";
import { SAVE_TEXT, useAutosave } from "@/hooks/use-autosave";
import { isSignedOut, SignedOutError } from "@/lib/autosave";
import { checkIdea, IDEA_MAX } from "@/lib/domain/idea";

type Props = {
  variant: "home" | "editor";
  postId?: string | null;
  initialIdea?: string;
  /** ID of the element that labels the box (Home uses its heading). */
  labelledBy?: string;
  generateLabel?: string;
  /** Extra reason to disable Generate (e.g. drafts are writing). */
  generateDisabled?: boolean;
  /** Editor: called with the saved idea when Generate is clicked. */
  onGenerate?: (postId: string, idea: string) => void;
  /** Editor: called after each save with the idea's new timestamp. */
  onIdeaSaved?: (ideaUpdatedAt: string) => void;
  children?: ReactNode;
};

export function IdeaBox({
  variant,
  postId = null,
  initialIdea = "",
  labelledBy,
  generateLabel = "Generate drafts",
  generateDisabled = false,
  onGenerate,
  onIdeaSaved,
  children,
}: Props) {
  const router = useRouter();
  const [idea, setIdea] = useState(initialIdea);
  const [opening, setOpening] = useState(false);
  const postIdRef = useRef(postId);

  const save = useCallback(
    async (text: string) => {
      const result = await saveIdea(postIdRef.current, text);
      if (isSignedOut(result)) throw new SignedOutError();
      postIdRef.current = result.postId;
      if (result.ideaUpdatedAt) onIdeaSaved?.(result.ideaUpdatedAt);
    },
    [onIdeaSaved],
  );
  const autosave = useAutosave(save);
  const check = checkIdea(idea);

  // Home hands its idea to the editor, but <Activity> keeps Home alive with
  // the old text and post ID. Once handed off, start fresh when Home is
  // hidden, so the next idea becomes a new post instead of overwriting this
  // one. An idea the user left mid-draft (no hand-off) is kept.
  const handedOff = useRef(false);
  const { cancel } = autosave;
  useLayoutEffect(
    () => () => {
      if (!handedOff.current) return;
      handedOff.current = false;
      postIdRef.current = null;
      cancel();
      setIdea("");
      setOpening(false);
    },
    [cancel],
  );

  function onChange(text: string) {
    setIdea(text);
    // Nothing to save until there's a post or something worth keeping.
    if (postIdRef.current || text.trim()) autosave.schedule(text);
    else autosave.cancel();
  }

  async function generate() {
    if (!check.canGenerate) return;
    setOpening(true);
    autosave.schedule(idea);
    const saved = await autosave.flush();
    const id = postIdRef.current;
    if (!id || !saved) return setOpening(false);
    if (onGenerate) {
      setOpening(false);
      onGenerate(id, idea.trim());
    } else {
      handedOff.current = true;
      router.push(`/posts/${id}?generate=1`);
    }
  }

  const isHome = variant === "home";
  const over = idea.length > IDEA_MAX;

  return (
    <div>
      {!labelledBy && (
        <label htmlFor="idea" className="eyebrow mb-3">
          Your idea
        </label>
      )}
      <textarea
        id="idea"
        value={idea}
        onChange={(e) => onChange(e.target.value)}
        // The idea is saved and on its way to the editor; typing now would
        // save after Home resets.
        readOnly={opening}
        aria-labelledby={labelledBy}
        aria-invalid={over || undefined}
        aria-describedby={check.message ? "idea-error" : undefined}
        placeholder="Type it rough. It doesn't need to be good."
        autoFocus={isHome}
        rows={isHome ? 6 : 5}
        className={`field block resize-y px-[18px] py-4 font-serif text-[20px] leading-[1.6] placeholder:text-neutral ${
          isHome ? "min-h-[180px] md:text-[21px]" : "min-h-[140px]"
        }`}
      />
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className={`text-caption tabular-nums ${over ? "font-semibold text-error" : "text-neutral"}`}>
          {idea.length.toLocaleString("en-US")} / {IDEA_MAX.toLocaleString("en-US")}
        </span>
        {check.message && (
          <span id="idea-error" className="text-caption text-error">
            {check.message}
          </span>
        )}
        <span
          role="status"
          className={`text-caption ${autosave.status === "error" || autosave.status === "signed-out" ? "text-error" : "text-neutral"}`}
        >
          {SAVE_TEXT[autosave.status]}
        </span>
        <span className="flex-1" />
        <button
          type="button"
          className="btn btn-primary"
          disabled={!check.canGenerate || generateDisabled || opening}
          onClick={generate}
        >
          {opening && isHome ? "Opening…" : generateLabel}
        </button>
      </div>
      {children}
    </div>
  );
}

"use client";

import { useId } from "react";

type Props = {
  /** Move focus here when it opens from this panel's own Regenerate. */
  autoFocus?: boolean;
  onKeep: () => void;
  onReplace: () => void;
};

/** Inline, not a modal: regenerating an edited draft asks first (FR-15). */
export function RegenerateConfirm({ autoFocus = false, onKeep, onReplace }: Props) {
  const id = useId();
  return (
    <div
      role="group"
      aria-labelledby={id}
      className="mt-3 flex flex-wrap items-center gap-2 rounded-sm border border-border bg-secondary px-3 py-2.5 text-ui-body"
    >
      <span id={id}>Regenerating replaces your edits to this draft.</span>
      <span className="flex-1" />
      <button type="button" className="btn btn-ghost btn-sm" autoFocus={autoFocus} onClick={onKeep}>
        Keep my edit
      </button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={onReplace}>
        Replace it
      </button>
    </div>
  );
}

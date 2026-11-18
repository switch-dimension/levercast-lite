"use client";

import { useEffect, useState } from "react";

type Props = {
  label: string;
  /** Accessible name when the visible label is ambiguous (e.g. "Copy tweet 3"). */
  ariaLabel?: string;
  variant?: "secondary" | "ghost";
  text: string;
  /** After a successful clipboard write. */
  onCopied: () => void | Promise<void>;
  /** The clipboard refused the write; nothing was copied. */
  onBlocked: () => void;
};

const DONE_MS = 1600;

/** Copies `text` and shows "Copied" briefly (FR-19). */
export function CopyButton({ label, ariaLabel, variant = "secondary", text, onCopied, onBlocked }: Props) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setDone(false), DONE_MS);
    return () => clearTimeout(timer);
  }, [done]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return onBlocked();
    }
    setDone(true);
    await onCopied();
  }

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        className={`btn btn-sm btn-${variant} ${done ? "btn-done" : ""}`}
        onClick={copy}
      >
        {done ? "Copied" : label}
      </button>
      <span className="sr-only" aria-live="polite">
        {done ? "Copied" : ""}
      </span>
    </>
  );
}

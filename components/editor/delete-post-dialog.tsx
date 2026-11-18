"use client";

import { useRef, useState, useTransition } from "react";
import { deletePost } from "@/app/(app)/actions";

/**
 * "Delete post" with a modal confirmation. A native <dialog> opened with
 * showModal() makes the page behind it inert, so focus stays inside, and
 * Escape cancels. Cancel gets focus first, as the safe choice.
 */
export function DeletePostDialog({ postId }: { postId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  // showModal() makes the page inert, but Tab past the last button still
  // leaves for the browser's own UI. Wrap it so focus stays in the dialog.
  function trapTab(event: React.KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled)")];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function confirm() {
    setError(null);
    startDelete(async () => {
      // Redirects to My posts on success; returns only on failure.
      const result = await deletePost(postId);
      setError(result.error);
    });
  }

  return (
    <>
      <button type="button" className="btn btn-ghost btn-danger -mr-2.5" onClick={() => dialog.current?.showModal()}>
        Delete post
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="delete-heading"
        aria-describedby="delete-description"
        onClose={() => setError(null)}
        onKeyDown={trapTab}
        className="m-auto w-[calc(100%-40px)] max-w-[420px] rounded-md border border-border bg-surface p-6 text-on-surface shadow-floating backdrop:bg-primary/35"
      >
        <h2 id="delete-heading" className="mb-2 font-serif text-headline-sm">
          Delete this post?
        </h2>
        <p id="delete-description" className="mb-5 text-ui-body text-neutral">
          Your idea and its drafts will be removed from your posts.
        </p>
        {error && (
          <p role="alert" className="mb-4 text-caption text-error">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" autoFocus className="btn btn-secondary" onClick={() => dialog.current?.close()}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger-fill" disabled={deleting} onClick={confirm}>
            {deleting ? "Deleting…" : "Delete post"}
          </button>
        </div>
      </dialog>
    </>
  );
}

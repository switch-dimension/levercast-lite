"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSaveQueue } from "@/lib/autosave";

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

export const SAVE_TEXT: Record<SaveStatus, string> = {
  idle: "",
  pending: "Saving…",
  saving: "Saving…",
  saved: "Saved",
  error: "Couldn't save. Check your connection, then keep typing to try again.",
};

/**
 * Debounced autosave (~1 s after typing stops) through a one-at-a-time save
 * queue. `flush()` saves anything waiting right away and resolves to whether
 * it saved. A pending value is also saved when the component unmounts.
 */
export function useAutosave<T>(save: (value: T) => Promise<void>, delay = 1000) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const saveRef = useRef(save);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waiting = useRef<{ value: T } | null>(null);
  const failed = useRef(false);
  const queueRef = useRef<ReturnType<typeof createSaveQueue<T>> | null>(null);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const queue = useCallback(
    () =>
      (queueRef.current ??= createSaveQueue<T>(
        async (value) => {
          setStatus("saving");
          await saveRef.current(value);
        },
        { onError: () => (failed.current = true) },
      )),
    [],
  );

  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const next = waiting.current;
    waiting.current = null;
    if (!next) {
      await queue().flush();
      return !failed.current;
    }
    failed.current = false;
    await queue().save(next.value);
    // A newer value may have been scheduled while this one saved.
    if (!waiting.current) setStatus(failed.current ? "error" : "saved");
    return !failed.current;
  }, [queue]);

  const schedule = useCallback(
    (value: T) => {
      waiting.current = { value };
      setStatus("pending");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [delay, flush],
  );

  /** Cancels a scheduled save without running it. */
  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    waiting.current = null;
    setStatus("idle");
  }, []);

  useEffect(
    () => () => {
      // Leaving the page, or being hidden by <Activity> (which keeps state):
      // save what's waiting now. The request outlives an unmount, and a
      // hidden-then-shown box must not stay on "Saving…".
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      const next = waiting.current;
      waiting.current = null;
      if (!next) return;
      failed.current = false;
      void queue()
        .save(next.value)
        .then(() => {
          if (!waiting.current) setStatus(failed.current ? "error" : "saved");
        });
    },
    [queue],
  );

  return { schedule, flush, cancel, status };
}

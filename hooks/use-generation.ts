"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SignedOutError } from "@/lib/autosave";
import { readDraftStream } from "@/lib/domain/draft-stream";
import { rateLimitMessage } from "@/lib/domain/rate-limit";
import type { Platform } from "@/lib/platforms";

export type PanelRun = { status: "idle" | "writing" | "failed"; text: string; error: string | null };

const IDLE: PanelRun = { status: "idle", text: "", error: null };
const FAILED_MESSAGE = "This draft didn't finish. Your idea and any earlier draft are safe.";
const SIGNED_OUT_MESSAGE = "Please sign in again to generate.";

/**
 * Runs generations, one streaming request per platform, in parallel. Each
 * panel streams into its own state. The stream ends with an in-band result;
 * `onDone` runs once a platform reports its draft saved.
 */
export function useGeneration(postId: string, onDone: (platform: Platform) => void | Promise<void>) {
  const [runs, setRuns] = useState<Partial<Record<Platform, PanelRun>>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const controllers = useRef(new Map<Platform, AbortController>());
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const update = (platform: Platform, run: PanelRun) => setRuns((prev) => ({ ...prev, [platform]: run }));

  const generateOne = useCallback(
    async (platform: Platform) => {
      if (controllers.current.has(platform)) return; // already writing (FR-16)
      const controller = new AbortController();
      controllers.current.set(platform, controller);
      update(platform, { status: "writing", text: "", error: null });

      try {
        const res = await fetch(`/api/posts/${postId}/generate/${platform}`, {
          method: "POST",
          signal: controller.signal,
        });
        if (res.status === 429) {
          const { retryAt } = (await res.json()) as { retryAt: string };
          setNotice(rateLimitMessage(new Date(retryAt)));
          update(platform, IDLE);
          return;
        }
        if (res.status === 401) {
          update(platform, { status: "failed", text: "", error: SIGNED_OUT_MESSAGE });
          return;
        }
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let received = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value;
          update(platform, { status: "writing", text: readDraftStream(received).text, error: null });
        }
        // No result means the connection dropped mid-draft.
        if (!readDraftStream(received).result?.ok) throw new Error("Generation didn't finish");
        await onDoneRef.current(platform);
        update(platform, IDLE);
      } catch (error) {
        // Left the page. A hidden page keeps its state, so drop the partial
        // text: coming back shows the previous draft or Not generated.
        if (controller.signal.aborted) update(platform, IDLE);
        // The draft saved, but the session ended before it could be loaded.
        else if (error instanceof SignedOutError)
          update(platform, { status: "failed", text: "", error: "Please sign in again to see this draft." });
        else update(platform, { status: "failed", text: "", error: FAILED_MESSAGE });
      } finally {
        controllers.current.delete(platform);
      }
    },
    [postId],
  );

  const generate = useCallback(
    (platforms: readonly Platform[]) => {
      setNotice(null);
      return Promise.all(platforms.map(generateOne));
    },
    [generateOne],
  );

  // Leaving the page cancels open streams; the server records them as failed.
  useEffect(() => {
    const open = controllers.current;
    return () => open.forEach((c) => c.abort());
  }, []);

  const writing = (platform: Platform) => runs[platform]?.status === "writing";
  return { runs, notice, generate, writing, anyWriting: Object.values(runs).some((r) => r?.status === "writing") };
}

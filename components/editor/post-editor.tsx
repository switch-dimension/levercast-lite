"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadDrafts } from "@/app/(app)/posts/[postId]/actions";
import { DeletePostDialog } from "@/components/editor/delete-post-dialog";
import { DraftPanel } from "@/components/editor/draft-panel";
import { StatusStrip } from "@/components/editor/status-strip";
import { IdeaBox } from "@/components/idea-box";
import { useGeneration } from "@/hooks/use-generation";
import { isEdited, planRegenerateAll } from "@/lib/domain/draft-state";
import type { DraftState, EditorDraft } from "@/lib/domain/editor-draft";
import { relativeTime } from "@/lib/domain/post-status";
import { PLATFORMS, type Platform } from "@/lib/platforms";

export type EditorPost = { id: string; idea: string; ideaUpdatedAt: string; createdAt: string };

type Props = {
  post: EditorPost;
  initialDrafts: EditorDraft[];
  /** Generate was clicked on Home: start all three on arrival. */
  autoGenerate?: boolean;
};

const byPlatform = (drafts: EditorDraft[]) =>
  Object.fromEntries(drafts.map((d) => [d.platform, d])) as Partial<Record<Platform, EditorDraft>>;

/** The post editor: the idea at the top, one section per platform below. */
export function PostEditor({ post, initialDrafts, autoGenerate = false }: Props) {
  const router = useRouter();
  const [drafts, setDrafts] = useState(() => byPlatform(initialDrafts));

  // Only the platform that finished is replaced, so unsaved edits in the
  // other panels survive.
  const refreshDraft = useCallback(
    async (platform: Platform) => {
      const fresh = byPlatform(await loadDrafts(post.id))[platform];
      setDrafts((prev) => ({ ...prev, [platform]: fresh }));
    },
    [post.id],
  );
  const generation = useGeneration(post.id, refreshDraft);

  // Panels asking "Keep my edit / Replace it", and whether each took focus.
  const [confirming, setConfirming] = useState<Partial<Record<Platform, boolean>>>({});
  const closeConfirm = (platform: Platform) =>
    setConfirming((prev) => {
      const next = { ...prev };
      delete next[platform];
      return next;
    });

  function regenerate(platform: Platform) {
    const draft = drafts[platform];
    if (draft && isEdited(draft)) setConfirming((prev) => ({ ...prev, [platform]: true }));
    else void generate([platform]);
  }

  function regenerateAll() {
    const { now, confirm } = planRegenerateAll(drafts);
    setConfirming(Object.fromEntries(confirm.map((p) => [p, false])));
    if (now.length) void generate(now);
  }

  const editDraft = (platform: Platform, content: string[]) =>
    setDrafts((prev) => {
      const draft = prev[platform];
      return draft ? { ...prev, [platform]: { ...draft, content } } : prev;
    });
  const { generate } = generation;

  // Arriving from Home's Generate: start once, and drop ?generate=1 so a
  // reload doesn't regenerate. The start waits a tick so React's development
  // mount-unmount-mount cycle (which aborts open streams) can't cancel it.
  const started = useRef(false);
  useEffect(() => {
    if (!autoGenerate || started.current) return;
    const timer = setTimeout(() => {
      started.current = true;
      router.replace(`/posts/${post.id}`, { scroll: false });
      void generate(PLATFORMS);
    }, 0);
    return () => clearTimeout(timer);
  }, [autoGenerate, generate, post.id, router]);

  const stateOf = (platform: Platform): DraftState => {
    const run = generation.runs[platform];
    if (run?.status === "writing") return "writing";
    if (run?.status === "failed") return "failed";
    return drafts[platform] ? "ready" : "empty";
  };
  const states = Object.fromEntries(PLATFORMS.map((p) => [p, stateOf(p)])) as Record<Platform, DraftState>;
  const hasDrafts = PLATFORMS.some((p) => drafts[p]);

  return (
    <>
      <StatusStrip states={states} />

      <main className="mx-auto w-full max-w-[760px] flex-1 px-5 pb-28 pt-8 md:px-8 md:pt-12">
        <IdeaBox
          variant="editor"
          postId={post.id}
          initialIdea={post.idea}
          generateLabel={hasDrafts ? "Regenerate all" : "Generate drafts"}
          generateDisabled={generation.anyWriting}
          onGenerate={regenerateAll}
        >
          {generation.notice && (
            <p role="status" className="mt-3 rounded-sm border border-border bg-secondary px-3.5 py-3 text-ui-body">
              {generation.notice}
            </p>
          )}
        </IdeaBox>

        <div className="mt-14 grid gap-12">
          {PLATFORMS.map((platform) => (
            <DraftPanel
              key={platform}
              postId={post.id}
              platform={platform}
              state={states[platform]}
              draft={drafts[platform]}
              run={generation.runs[platform]}
              onRetry={() => void generate([platform])}
              onEdit={(content) => editDraft(platform, content)}
              onRegenerate={() => regenerate(platform)}
              confirm={
                platform in confirming
                  ? {
                      autoFocus: confirming[platform]!,
                      onKeep: () => closeConfirm(platform),
                      onReplace: () => {
                        closeConfirm(platform);
                        void generate([platform]);
                      },
                    }
                  : undefined
              }
            />
          ))}
        </div>

        <footer className="mt-[72px] flex items-center justify-between border-t border-border pt-5">
          <span className="text-caption text-neutral">
            Created <time dateTime={post.createdAt}>{relativeTime(new Date(post.createdAt))}</time>
          </span>
          <DeletePostDialog postId={post.id} />
        </footer>
      </main>
    </>
  );
}
